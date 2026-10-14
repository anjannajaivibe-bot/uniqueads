"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireAppUser } from "@/lib/auth/authorization";

const roles = [
  "super_admin",
  "accounts",
  "operations_manager",
  "supervisor",
  "sales",
] as const;

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function lower(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

async function requireSuperAdmin() {
  const currentUser = await requireAppUser();
  if (currentUser.role !== "super_admin") {
    throw new Error("Only a Super Admin can change Settings and user access.");
  }
  return currentUser;
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

export async function saveCompanySettings(formData: FormData) {
  const currentUser = await requireSuperAdmin();

  const companyName = clean(formData.get("company_name")) || "Unique Ads";

  const existing = await sql`
    SELECT id
    FROM company_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  let settingsId: string;

  if (existing.length > 0) {
    settingsId = String(existing[0].id);

    await sql`
      UPDATE company_settings
      SET
        company_name = ${companyName},
        legal_name = ${clean(formData.get("legal_name"))},
        phone = ${clean(formData.get("phone"))},
        whatsapp = ${clean(formData.get("whatsapp"))},
        email = ${clean(formData.get("email"))},
        website = ${clean(formData.get("website"))},
        address = ${clean(formData.get("address"))},
        gstin = ${clean(formData.get("gstin"))},
        pan = ${clean(formData.get("pan"))},
        bank_name = ${clean(formData.get("bank_name"))},
        bank_account_name = ${clean(formData.get("bank_account_name"))},
        bank_account_number = ${clean(formData.get("bank_account_number"))},
        ifsc_code = ${clean(formData.get("ifsc_code"))},
        upi_id = ${clean(formData.get("upi_id"))},
        logo_url = ${clean(formData.get("logo_url"))},
        quotation_terms = ${clean(formData.get("quotation_terms"))},
        invoice_terms = ${clean(formData.get("invoice_terms"))},
        updated_at = now()
      WHERE id = ${settingsId}::uuid
    `;
  } else {
    const rows = await sql`
      INSERT INTO company_settings (
        company_name,
        legal_name,
        phone,
        whatsapp,
        email,
        website,
        address,
        gstin,
        pan,
        bank_name,
        bank_account_name,
        bank_account_number,
        ifsc_code,
        upi_id,
        logo_url,
        quotation_terms,
        invoice_terms
      ) VALUES (
        ${companyName},
        ${clean(formData.get("legal_name"))},
        ${clean(formData.get("phone"))},
        ${clean(formData.get("whatsapp"))},
        ${clean(formData.get("email"))},
        ${clean(formData.get("website"))},
        ${clean(formData.get("address"))},
        ${clean(formData.get("gstin"))},
        ${clean(formData.get("pan"))},
        ${clean(formData.get("bank_name"))},
        ${clean(formData.get("bank_account_name"))},
        ${clean(formData.get("bank_account_number"))},
        ${clean(formData.get("ifsc_code"))},
        ${clean(formData.get("upi_id"))},
        ${clean(formData.get("logo_url"))},
        ${clean(formData.get("quotation_terms"))},
        ${clean(formData.get("invoice_terms"))}
      )
      RETURNING id
    `;
    settingsId = String(rows[0].id);
  }

  await logActivity(
    currentUser.id,
    "company_settings",
    settingsId,
    "company_settings_updated",
    "Company, banking and commercial defaults updated."
  );

  revalidatePath("/admin/settings");
  revalidatePath("/admin/quotations/new");
  revalidatePath("/admin/finance/invoices/new");
}

export async function createAppUser(formData: FormData) {
  const currentUser = await requireSuperAdmin();

  const fullName = clean(formData.get("full_name"));
  const email = lower(formData.get("email"));
  const phone = clean(formData.get("phone"));
  const role = clean(formData.get("role")) || "sales";

  if (!fullName || !email) {
    throw new Error("Full name and email are required.");
  }

  if (!roles.includes(role as (typeof roles)[number])) {
    throw new Error("Invalid role.");
  }

  const rows = await sql`
    INSERT INTO app_users (
      full_name,
      email,
      phone,
      role,
      is_active
    ) VALUES (
      ${fullName},
      ${email},
      ${phone},
      ${role},
      true
    )
    ON CONFLICT (email) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now()
    RETURNING id, auth_user_id
  `;

  const userId = String(rows[0].id);

  await logActivity(
    currentUser.id,
    "app_user",
    userId,
    "app_user_created_or_updated",
    `Access profile prepared for ${email}.`,
    {
      role,
      already_linked_to_auth: Boolean(rows[0].auth_user_id),
    }
  );

  revalidatePath("/admin/settings");
}

export async function updateAppUserAccess(formData: FormData) {
  const currentUser = await requireSuperAdmin();

  const userId = clean(formData.get("user_id"));
  const role = clean(formData.get("role"));
  const active = clean(formData.get("is_active")) === "true";

  if (!userId || !role || !roles.includes(role as (typeof roles)[number])) {
    throw new Error("Invalid user access update.");
  }

  const targetRows = await sql`
    SELECT id, full_name, email, role, is_active
    FROM app_users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;

  const target = targetRows[0] as any;
  if (!target) throw new Error("User not found.");

  if (String(target.id) === String(currentUser.id)) {
    if (!active) {
      throw new Error("You cannot deactivate your own Super Admin account.");
    }
    if (role !== "super_admin") {
      throw new Error("You cannot remove your own Super Admin role.");
    }
  }

  const removingSuperAdmin =
    target.role === "super_admin" &&
    (role !== "super_admin" || !active);

  if (removingSuperAdmin) {
    const admins = await sql`
      SELECT count(*)::int AS count
      FROM app_users
      WHERE role = 'super_admin'
        AND is_active = true
    `;

    if (Number(admins[0]?.count || 0) <= 1) {
      throw new Error("At least one active Super Admin must remain.");
    }
  }

  await sql`
    UPDATE app_users
    SET
      role = ${role},
      is_active = ${active},
      updated_at = now()
    WHERE id = ${userId}::uuid
  `;

  await logActivity(
    currentUser.id,
    "app_user",
    userId,
    "app_user_access_updated",
    `Access updated for ${target.email}.`,
    { role, is_active: active }
  );

  revalidatePath("/admin/settings");
}
