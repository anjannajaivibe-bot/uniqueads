"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function customerCode() {
  return `UA-CUS-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function logCustomerActivity(
  actorUserId: string,
  customerId: string,
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
      'customer',
      ${customerId}::uuid,
      ${description},
      ${JSON.stringify(metadata)}
    )
  `;
}

export async function createCustomer(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const companyName = clean(formData.get("company_name"));
  if (!companyName) throw new Error("Company / customer name is required.");

  const code = customerCode();

  const rows = await sql`
    INSERT INTO customers (
      customer_code,
      company_name,
      contact_person,
      phone,
      whatsapp,
      email,
      gstin,
      billing_address,
      city,
      state,
      pincode,
      notes,
      is_active,
      created_by
    ) VALUES (
      ${code},
      ${companyName},
      ${clean(formData.get("contact_person"))},
      ${clean(formData.get("phone"))},
      ${clean(formData.get("whatsapp"))},
      ${clean(formData.get("email"))},
      ${clean(formData.get("gstin"))},
      ${clean(formData.get("billing_address"))},
      ${clean(formData.get("city"))},
      ${clean(formData.get("state"))},
      ${clean(formData.get("pincode"))},
      ${clean(formData.get("notes"))},
      true,
      ${currentUser.id}
    )
    RETURNING id
  `;

  const customerId = String(rows[0].id);

  await logCustomerActivity(
    currentUser.id,
    customerId,
    "customer_created",
    `Customer ${companyName} created.`,
    { customer_code: code }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/quotations/new");
  redirect(`/admin/customers/${customerId}`);
}

export async function updateCustomer(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const customerId = clean(formData.get("customer_id"));
  const companyName = clean(formData.get("company_name"));

  if (!customerId || !companyName) {
    throw new Error("Customer ID and company / customer name are required.");
  }

  await sql`
    UPDATE customers
    SET
      company_name = ${companyName},
      contact_person = ${clean(formData.get("contact_person"))},
      phone = ${clean(formData.get("phone"))},
      whatsapp = ${clean(formData.get("whatsapp"))},
      email = ${clean(formData.get("email"))},
      gstin = ${clean(formData.get("gstin"))},
      billing_address = ${clean(formData.get("billing_address"))},
      city = ${clean(formData.get("city"))},
      state = ${clean(formData.get("state"))},
      pincode = ${clean(formData.get("pincode"))},
      notes = ${clean(formData.get("notes"))},
      updated_at = now()
    WHERE id = ${customerId}::uuid
  `;

  await logCustomerActivity(
    currentUser.id,
    customerId,
    "customer_updated",
    "Customer profile updated."
  );

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/quotations/new");
}

export async function toggleCustomerActive(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const customerId = clean(formData.get("customer_id"));
  const nextActive = clean(formData.get("next_active")) === "true";

  if (!customerId) throw new Error("Customer ID is required.");

  const rows = await sql`
    UPDATE customers
    SET is_active = ${nextActive}, updated_at = now()
    WHERE id = ${customerId}::uuid
    RETURNING company_name
  `;

  const companyName = rows[0]?.company_name
    ? String(rows[0].company_name)
    : "Customer";

  await logCustomerActivity(
    currentUser.id,
    customerId,
    nextActive ? "customer_reactivated" : "customer_deactivated",
    `${companyName} ${nextActive ? "reactivated" : "deactivated"}.`
  );

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/quotations/new");
}

