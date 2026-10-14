"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

async function logActivity(
  actorUserId: string,
  entityId: string,
  action: string,
  description: string
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
      'company_settings',
      ${entityId}::uuid,
      ${description},
      '{}'::jsonb
    )
  `;
}

export async function saveCompanySettings(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.settings);
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
    settingsId,
    "company_settings_updated",
    "Company, banking and commercial defaults updated."
  );

  revalidatePath("/admin/settings");
  revalidatePath("/admin/quotations/new");
  revalidatePath("/admin/finance/invoices/new");
}
