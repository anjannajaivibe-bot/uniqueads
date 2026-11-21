"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

export async function saveEntityProfile(form: FormData) {
  await requireRoles(ACCESS.settings);
  const code = String(form.get("code") ?? "");
  if (code !== "unique_ads" && code !== "unique_advertisers") {
    throw new Error("Invalid receiving entity.");
  }
  const get = (name: string) => String(form.get(name) ?? "").trim() || null;
  const gst = get("gstin");
  const pan = get("pan");
  if (gst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(gst)) {
    throw new Error("GSTIN format is invalid.");
  }
  if (pan && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(pan)) {
    throw new Error("PAN format is invalid.");
  }
  await sql`
    UPDATE public.business_entities
    SET legal_name=${get("legal_name")}, gstin=${gst}, pan=${pan},
      address=${get("address")}, phone=${get("phone")}, email=${get("email")},
      bank_name=${get("bank_name")},
      bank_account_name=${get("bank_account_name")},
      bank_account_number=${get("bank_account_number")},
      ifsc_code=${get("ifsc_code")}, upi_id=${get("upi_id")}, updated_at=now()
    WHERE code=${code}
  `;
  revalidatePath("/admin/settings/entities");
  revalidatePath("/admin/finance");
}
