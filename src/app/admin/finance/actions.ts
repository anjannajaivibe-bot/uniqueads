"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

type InvoiceItemInput = {
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
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : 0;
}

function invoiceNo() {
  return `UA-INV-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function paymentNo() {
  return `UA-RCP-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function expenseNo() {
  return `UA-EXP-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function parseItems(raw: string | null): InvoiceItemInput[] {
  if (!raw) throw new Error("At least one invoice item is required.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invoice items are invalid.");
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 50) {
    throw new Error("Invoice must contain between 1 and 50 items.");
  }

  return parsed.map((item: any) => {
    const description = String(item?.description ?? "").trim();
    const quantity = money(item?.quantity);
    const rate = money(item?.rate);
    const unit = String(item?.unit ?? "").trim() || null;

    if (!description) throw new Error("Every invoice item needs a description.");
    if (quantity <= 0) throw new Error("Every invoice item needs a quantity greater than zero.");

    return { description, quantity, rate, unit };
  });
}

async function logActivity(
  actorUserId: string,
  entityType: string,
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

export async function createInvoice(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.finance);

  const orderId = clean(formData.get("order_id"));
  if (!orderId) throw new Error("Order is required.");

  const orderRows = await sql`
    SELECT
      o.id,
      o.order_no,
      o.customer_id,
      o.advance_received
    FROM orders o
    WHERE o.id = ${orderId}::uuid
      AND o.status <> 'cancelled'
    LIMIT 1
  `;

  const order = orderRows[0] as any;
  if (!order) throw new Error("Order not found.");

  const items = parseItems(clean(formData.get("items_json")));
  const discountAmount = money(clean(formData.get("discount_amount")));
  const taxMode = clean(formData.get("tax_mode")) ?? "none";

  const subtotal =
    Math.round(
      items.reduce(
        (sum, item) => sum + item.quantity * item.rate,
        0
      ) * 100
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

  const totalAmount =
    Math.round(
      (taxableAmount + cgstAmount + sgstAmount + igstAmount) * 100
    ) / 100;

  const number = invoiceNo();

  const rows = await sql`
    INSERT INTO invoices (
      invoice_no,
      order_id,
      customer_id,
      invoice_date,
      due_date,
      status,
      subtotal,
      discount_amount,
      taxable_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      total_amount,
      amount_paid,
      payment_terms,
      notes,
      created_by
    ) VALUES (
      ${number},
      ${orderId}::uuid,
      ${order.customer_id}::uuid,
      ${clean(formData.get("invoice_date")) ?? new Date().toISOString().slice(0, 10)},
      ${clean(formData.get("due_date"))},
      'draft',
      ${subtotal},
      ${safeDiscount},
      ${taxableAmount},
      ${cgstAmount},
      ${sgstAmount},
      ${igstAmount},
      ${totalAmount},
      0,
      ${clean(formData.get("payment_terms"))},
      ${clean(formData.get("notes"))},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const invoiceId = String(rows[0].id);

  const normalized = items.map((item, index) => ({
    sort_order: index,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    amount: Math.round(item.quantity * item.rate * 100) / 100,
  }));

  await sql`
    INSERT INTO invoice_items (
      invoice_id,
      sort_order,
      description,
      quantity,
      unit,
      rate,
      amount
    )
    SELECT
      ${invoiceId}::uuid,
      x.sort_order,
      x.description,
      x.quantity,
      x.unit,
      x.rate,
      x.amount
    FROM jsonb_to_recordset(${JSON.stringify(normalized)}::jsonb)
      AS x(
        sort_order integer,
        description text,
        quantity numeric,
        unit text,
        rate numeric,
        amount numeric
      )
  `;

  const existingPayments = await sql`
    SELECT COALESCE(sum(amount), 0) AS total
    FROM customer_payments
    WHERE order_id = ${orderId}::uuid
  `;

  const existingOrderPayments = Number(existingPayments[0]?.total || 0);
  const recordedAdvance = Number(order.advance_received || 0);

  if (recordedAdvance > 0 && existingOrderPayments === 0) {
    const advancePaymentNo = paymentNo();

    await sql`
      INSERT INTO customer_payments (
        payment_no,
        customer_id,
        order_id,
        invoice_id,
        payment_date,
        amount,
        payment_method,
        notes,
        received_by
      ) VALUES (
        ${advancePaymentNo},
        ${order.customer_id}::uuid,
        ${orderId}::uuid,
        ${invoiceId}::uuid,
        CURRENT_DATE,
        ${Math.min(recordedAdvance, totalAmount)},
        NULL,
        'Advance carried forward from order confirmation',
        ${currentUser.id}
      )
    `;
  } else if (existingOrderPayments > 0) {
    await sql`
      UPDATE customer_payments
      SET invoice_id = ${invoiceId}::uuid
      WHERE order_id = ${orderId}::uuid
        AND invoice_id IS NULL
    `;
  }

  const paymentRows = await sql`
    SELECT COALESCE(sum(amount), 0) AS paid
    FROM customer_payments
    WHERE invoice_id = ${invoiceId}::uuid
  `;

  const paid = Math.min(totalAmount, Number(paymentRows[0]?.paid || 0));

  await sql`
    UPDATE invoices
    SET
      amount_paid = ${paid},
      status = CASE
        WHEN ${paid} >= total_amount AND total_amount > 0 THEN 'paid'
        WHEN ${paid} > 0 THEN 'partially_paid'
        ELSE 'draft'
      END,
      updated_at = now()
    WHERE id = ${invoiceId}::uuid
  `;

  await logActivity(
    currentUser.id,
    "invoice",
    invoiceId,
    "invoice_created",
    `Invoice ${number} created for order ${order.order_no}.`,
    { order_id: orderId, total_amount: totalAmount }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/finance/invoices/${invoiceId}`);
}

export async function updateInvoiceStatus(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.finance);

  const invoiceId = clean(formData.get("invoice_id"));
  const status = clean(formData.get("status"));

  const allowed = ["draft", "issued", "cancelled"];
  if (!invoiceId || !status || !allowed.includes(status)) {
    throw new Error("Invalid invoice status.");
  }

  const rows = await sql`
    SELECT invoice_no, order_id, amount_paid, total_amount, status
    FROM invoices
    WHERE id = ${invoiceId}::uuid
    LIMIT 1
  `;

  const invoice = rows[0] as any;
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "paid" && status !== "cancelled") {
    throw new Error("A paid invoice cannot be moved back to draft or issued.");
  }

  await sql`
    UPDATE invoices
    SET status = ${status}, updated_at = now()
    WHERE id = ${invoiceId}::uuid
  `;

  if (status === "issued") {
    await sql`
      UPDATE orders
      SET status = 'invoiced', updated_at = now()
      WHERE id = ${invoice.order_id}::uuid
        AND status NOT IN ('closed', 'cancelled')
    `;
  }

  await logActivity(
    currentUser.id,
    "invoice",
    invoiceId,
    "invoice_status_changed",
    `Invoice status changed to ${status}.`,
    { status }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath(`/admin/finance/invoices/${invoiceId}`);
  revalidatePath(`/admin/orders/${invoice.order_id}`);
}

export async function recordCustomerPayment(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.finance);

  const invoiceId = clean(formData.get("invoice_id"));
  const amount = money(clean(formData.get("amount")));
  const method = clean(formData.get("payment_method"));

  const allowedMethods = [
    "cash",
    "bank_transfer",
    "upi",
    "cheque",
    "card",
    "other",
  ];

  if (!invoiceId || amount <= 0) {
    throw new Error("Invoice and payment amount are required.");
  }
  if (method && !allowedMethods.includes(method)) {
    throw new Error("Invalid payment method.");
  }

  const invoiceRows = await sql`
    SELECT
      id,
      invoice_no,
      customer_id,
      order_id,
      total_amount,
      amount_paid,
      status
    FROM invoices
    WHERE id = ${invoiceId}::uuid
    LIMIT 1
  `;

  const invoice = invoiceRows[0] as any;
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "cancelled") {
    throw new Error("Payments cannot be recorded against a cancelled invoice.");
  }

  const remaining =
    Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid));

  if (amount > remaining + 0.009) {
    throw new Error(`Payment exceeds invoice outstanding of ₹${remaining.toFixed(2)}.`);
  }

  const number = paymentNo();

  await sql`
    INSERT INTO customer_payments (
      payment_no,
      customer_id,
      order_id,
      invoice_id,
      payment_date,
      amount,
      payment_method,
      reference_no,
      notes,
      received_by
    ) VALUES (
      ${number},
      ${invoice.customer_id}::uuid,
      ${invoice.order_id}::uuid,
      ${invoiceId}::uuid,
      ${clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10)},
      ${amount},
      ${method},
      ${clean(formData.get("reference_no"))},
      ${clean(formData.get("notes"))},
      ${currentUser.id}
    )
  `;

  const totals = await sql`
    SELECT COALESCE(sum(amount), 0) AS paid
    FROM customer_payments
    WHERE invoice_id = ${invoiceId}::uuid
  `;

  const paid = Math.min(
    Number(invoice.total_amount),
    Number(totals[0]?.paid || 0)
  );

  const nextStatus =
    paid >= Number(invoice.total_amount) && Number(invoice.total_amount) > 0
      ? "paid"
      : paid > 0
        ? "partially_paid"
        : invoice.status;

  await sql`
    UPDATE invoices
    SET
      amount_paid = ${paid},
      status = ${nextStatus},
      updated_at = now()
    WHERE id = ${invoiceId}::uuid
  `;

  await logActivity(
    currentUser.id,
    "invoice",
    invoiceId,
    "customer_payment_recorded",
    `Payment ${number} recorded for ${invoice.invoice_no}.`,
    { payment_no: number, amount, payment_method: method }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${invoice.customer_id}`);
  revalidatePath(`/admin/finance/invoices/${invoiceId}`);
}

export async function createExpense(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.finance);

  const category = clean(formData.get("category"));
  const description = clean(formData.get("description"));
  const amount = money(clean(formData.get("amount")));
  const method = clean(formData.get("payment_method"));

  const allowedCategories = [
    "paint",
    "brushes_material",
    "printing",
    "vinyl",
    "transport",
    "fuel",
    "lodging",
    "food",
    "wall_owner_payment",
    "permissions",
    "contractor_payment",
    "office",
    "salary",
    "miscellaneous",
  ];

  const allowedMethods = [
    "cash",
    "bank_transfer",
    "upi",
    "cheque",
    "card",
    "other",
  ];

  if (!category || !allowedCategories.includes(category)) {
    throw new Error("Valid expense category is required.");
  }
  if (!description || amount <= 0) {
    throw new Error("Expense description and amount are required.");
  }
  if (method && !allowedMethods.includes(method)) {
    throw new Error("Invalid payment method.");
  }

  const number = expenseNo();

  const rows = await sql`
    INSERT INTO expenses (
      expense_no,
      expense_date,
      order_id,
      category,
      vendor_name,
      description,
      amount,
      payment_method,
      bill_url,
      entered_by
    ) VALUES (
      ${number},
      ${clean(formData.get("expense_date")) ?? new Date().toISOString().slice(0, 10)},
      ${clean(formData.get("order_id"))},
      ${category},
      ${clean(formData.get("vendor_name"))},
      ${description},
      ${amount},
      ${method},
      ${clean(formData.get("bill_url"))},
      ${currentUser.id}
    )
    RETURNING id
  `;

  const expenseId = String(rows[0].id);

  await logActivity(
    currentUser.id,
    "expense",
    expenseId,
    "expense_created",
    `Expense ${number} recorded.`,
    { expense_no: number, amount, category }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/finance");
}

