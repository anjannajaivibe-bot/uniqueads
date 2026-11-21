"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

export async function recordCompanyReceipt(form: FormData) {
  const actor = await requireRoles(ACCESS.finance);
  const orderId = String(form.get("order_id") ?? "").trim();
  const amountRaw = String(form.get("amount") ?? "");
  const amount = Number(amountRaw);
  const method = String(form.get("payment_method") ?? "").trim() || null;
  const reference = String(form.get("reference_no") ?? "").trim() || null;
  const date = String(form.get("payment_date") ?? "").trim() || null;
  const notes = String(form.get("notes") ?? "").trim() || null;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(orderId)) throw new Error("Select a valid work order.");
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountRaw) || !Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
    throw new Error("Enter a positive receipt amount with at most two decimal places.");
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid receipt date.");
  const rows = await sql`
    SELECT * FROM public.record_company_work_receipt(
      ${orderId}::uuid, ${actor.id}::uuid, ${amount}::numeric,
      ${method}, ${reference}, ${date}::date, ${notes}
    )
  `;
  if (!rows.length) throw new Error("Unable to record this receipt.");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/collections");
  revalidatePath("/admin/reports");
  redirect(`/admin/finance/collections?order=${orderId}&saved=1`);
}
