"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

type InputItem = {
  description: string;
  quantity: number;
  unit: string | null;
  rate: number;
};

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function money(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : 0;
}

function quotationNumber() {
  return `UA-QTN-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function orderNumber() {
  return `UA-ORD-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function customerCode() {
  return `UA-CUS-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function parseItems(raw: string | null): InputItem[] {
  if (!raw) throw new Error("At least one quotation item is required.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Quotation items are invalid.");
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 50) {
    throw new Error("Quotation must contain between 1 and 50 items.");
  }

  return parsed.map((item: any) => {
    const description = String(item?.description ?? "").trim();
    const quantity = money(item?.quantity);
    const rate = money(item?.rate);
    const unit = String(item?.unit ?? "").trim() || null;

    if (!description) throw new Error("Every quotation item needs a description.");
    if (quantity <= 0) throw new Error("Every quotation item needs a quantity greater than zero.");
    if (rate < 0) throw new Error("Quotation item rate cannot be negative.");

    return { description, quantity, rate, unit };
  });
}

async function logActivity(
  actorUserId: string,
  entityType: "quotation" | "order" | "lead",
  entityId: string,
  action: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await sql`
    INSERT INTO activity_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      description,
      metadata
    ) VALUES (
      ${actorUserId},
      ${action},
      ${entityType},
      ${entityId}::uuid,
      ${description},
      ${JSON.stringify(metadata)}
    )
  `;
}

export async function createQuotation(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.sales);

  const leadId = clean(formData.get("lead_id"));
  let customerId = clean(formData.get("customer_id"));

  if (!leadId && !customerId) {
    throw new Error("Select a customer or a lead.");
  }

  if (leadId && !customerId) {
    const leadRows = await sql`
      SELECT customer_id
      FROM leads
      WHERE id = ${leadId}::uuid
      LIMIT 1
    `;
    customerId = leadRows[0]?.customer_id ? String(leadRows[0].customer_id) : null;
  }

  const items = parseItems(clean(formData.get("items_json")));
  const discountAmount = money(clean(formData.get("discount_amount")));
  const taxMode = clean(formData.get("tax_mode")) ?? "none";

  const subtotal = Math.round(
    items.reduce((sum, item) => sum + item.quantity * item.rate, 0) * 100
  ) / 100;

  const safeDiscount = Math.min(discountAmount, subtotal);
  const taxableAmount = Math.round((subtotal - safeDiscount) * 100) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxMode === "intra_18") {
    cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
    sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  } else if (taxMode === "inter_18") {
    igstAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  } else if (taxMode !== "none") {
    throw new Error("Invalid GST mode.");
  }

  const grandTotal =
    Math.round((taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100) / 100;

  const quotationNo = quotationNumber();

  const rows = await sql`
    INSERT INTO quotations (
      quotation_no,
      lead_id,
      customer_id,
      quotation_date,
      valid_until,
      status,
      scope_of_work,
      subtotal,
      discount_amount,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      grand_total,
      payment_terms,
      terms_and_conditions,
      notes,
      created_by
    ) VALUES (
      ${quotationNo},
      ${leadId},
      ${customerId},
      CURRENT_DATE,
      ${clean(formData.get("valid_until"))},
      'draft',
      ${clean(formData.get("scope_of_work"))},
      ${subtotal},
      ${safeDiscount},
      ${taxableAmount},
      ${cgstAmount},
      ${sgstAmount},
      ${igstAmount},
      ${grandTotal},
      ${clean(formData.get("payment_terms"))},
      ${clean(formData.get("terms_and_conditions"))},
      ${clean(formData.get("notes"))},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const quotationId = String(rows[0].id);

  const normalizedItems = items.map((item, index) => ({
    sort_order: index,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: Math.round(item.quantity * item.rate * 100) / 100,
  }));

  await sql`
    INSERT INTO quotation_items (
      quotation_id,
      sort_order,
      description,
      quantity,
      unit,
      rate,
      amount
    )
    SELECT
      ${quotationId}::uuid,
      x.sort_order,
      x.description,
      x.quantity,
      x.unit,
      x.rate,
      x.amount
    FROM jsonb_to_recordset(${JSON.stringify(normalizedItems)}::jsonb)
      AS x(
        sort_order integer,
        description text,
        quantity numeric,
        unit text,
        rate numeric,
        amount numeric
      )
  `;

  await logActivity(
    currentUser.id,
    "quotation",
    quotationId,
    "quotation_created",
    `Quotation ${quotationNo} created.`,
    { quotation_no: quotationNo, grand_total: grandTotal }
  );

  if (leadId) {
    await sql`
      UPDATE leads
      SET
        status = CASE
          WHEN status IN ('won', 'lost') THEN status
          ELSE 'quotation_sent'
        END,
        updated_at = now()
      WHERE id = ${leadId}::uuid
    `;

    await logActivity(
      currentUser.id,
      "lead",
      leadId,
      "quotation_created",
      `Quotation ${quotationNo} created for this lead.`,
      { quotation_id: quotationId, quotation_no: quotationNo }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/leads");
  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${quotationId}`);
}

export async function updateQuotationStatus(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.sales);
  const quotationId = clean(formData.get("quotation_id"));
  const status = clean(formData.get("status"));

  const allowed = ["draft", "sent", "accepted", "rejected", "expired"];

  if (!quotationId || !status || !allowed.includes(status)) {
    throw new Error("Invalid quotation status.");
  }

  const currentRows = await sql`
    SELECT status, quotation_no
    FROM quotations
    WHERE id = ${quotationId}::uuid
    LIMIT 1
  `;

  const current = currentRows[0] as any;
  if (!current) throw new Error("Quotation not found.");
  if (current.status === "converted") {
    throw new Error("A converted quotation cannot be changed.");
  }

  await sql`
    UPDATE quotations
    SET status = ${status}, updated_at = now()
    WHERE id = ${quotationId}::uuid
  `;

  await logActivity(
    currentUser.id,
    "quotation",
    quotationId,
    "quotation_status_changed",
    `Quotation status changed to ${status}.`,
    { status }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/quotations");
  revalidatePath(`/admin/quotations/${quotationId}`);
}

export async function convertQuotationToOrder(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.sales);

  const quotationId = clean(formData.get("quotation_id"));
  const campaignName = clean(formData.get("campaign_name"));

  if (!quotationId || !campaignName) {
    throw new Error("Quotation and campaign name are required.");
  }

  const quotationRows = await sql`
    SELECT
      q.*,
      l.company_name AS lead_company_name,
      l.contact_person AS lead_contact_person,
      l.phone AS lead_phone,
      l.whatsapp AS lead_whatsapp,
      l.email AS lead_email,
      l.remarks AS lead_remarks,
      l.customer_id AS lead_customer_id
    FROM quotations q
    LEFT JOIN leads l ON l.id = q.lead_id
    WHERE q.id = ${quotationId}::uuid
    LIMIT 1
  `;

  const quotation = quotationRows[0] as any;
  if (!quotation) throw new Error("Quotation not found.");
  if (quotation.status !== "accepted") {
    throw new Error("Only an accepted quotation can be converted to an order.");
  }

  const existingOrders = await sql`
    SELECT id, order_no
    FROM orders
    WHERE quotation_id = ${quotationId}::uuid
    LIMIT 1
  `;

  if (existingOrders[0]) {
    throw new Error(
      `This quotation is already linked to order ${existingOrders[0].order_no}.`
    );
  }

  let customerId = quotation.customer_id
    ? String(quotation.customer_id)
    : quotation.lead_customer_id
      ? String(quotation.lead_customer_id)
      : null;

  if (!customerId && quotation.lead_id) {
    const code = customerCode();
    const companyName =
      String(quotation.lead_company_name || "").trim() ||
      String(quotation.lead_contact_person || "").trim();

    const customerRows = await sql`
      INSERT INTO customers (
        customer_code,
        company_name,
        contact_person,
        phone,
        whatsapp,
        email,
        notes,
        created_by
      ) VALUES (
        ${code},
        ${companyName},
        ${quotation.lead_contact_person},
        ${quotation.lead_phone},
        ${quotation.lead_whatsapp},
        ${quotation.lead_email},
        ${quotation.lead_remarks},
        ${currentUser.id}
      )
      RETURNING id
    `;

    customerId = String(customerRows[0].id);

    await sql`
      UPDATE leads
      SET customer_id = ${customerId}::uuid, status = 'won', updated_at = now()
      WHERE id = ${quotation.lead_id}::uuid
    `;

    await sql`
      UPDATE quotations
      SET customer_id = ${customerId}::uuid, updated_at = now()
      WHERE id = ${quotationId}::uuid
    `;
  }

  if (!customerId) {
    throw new Error("A customer is required before converting the quotation.");
  }

  const orderNo = orderNumber();
  const advanceReceived = money(clean(formData.get("advance_received")));

  const orderRows = await sql`
    INSERT INTO orders (
      order_no,
      quotation_id,
      customer_id,
      campaign_name,
      advertising_type,
      start_date,
      due_date,
      status,
      total_order_amount,
      advance_received,
      work_instructions,
      created_by
    ) VALUES (
      ${orderNo},
      ${quotationId}::uuid,
      ${customerId}::uuid,
      ${campaignName},
      ${clean(formData.get("advertising_type"))},
      ${clean(formData.get("start_date"))},
      ${clean(formData.get("due_date"))},
      'order_received',
      ${Number(quotation.grand_total || 0)},
      ${advanceReceived},
      ${clean(formData.get("work_instructions"))},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const orderId = String(orderRows[0].id);

  await sql`
    UPDATE quotations
    SET status = 'converted', updated_at = now()
    WHERE id = ${quotationId}::uuid
  `;

  if (quotation.lead_id) {
    await sql`
      UPDATE leads
      SET status = 'won', customer_id = ${customerId}::uuid, updated_at = now()
      WHERE id = ${quotation.lead_id}::uuid
    `;
  }

  await logActivity(
    currentUser.id,
    "quotation",
    quotationId,
    "quotation_converted",
    `Quotation converted to order ${orderNo}.`,
    { order_id: orderId, order_no: orderNo }
  );

  await logActivity(
    currentUser.id,
    "order",
    orderId,
    "order_created",
    `Order ${orderNo} created from quotation.`,
    { quotation_id: quotationId }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/leads");
  redirect(`/admin/orders/${orderId}`);
}


