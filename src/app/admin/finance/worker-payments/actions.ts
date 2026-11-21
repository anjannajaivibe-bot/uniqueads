"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;

export async function addWorkerPayment(form: FormData) {
  const actor = await requireRoles(ACCESS.finance);
  const workerId = value(form, "worker_id");
  const orderId = value(form, "order_id");
  const amountRaw = value(form, "amount");
  const amount = Number(amountRaw);
  const paymentType = value(form, "payment_type") || "progress";
  const paymentMethod = value(form, "payment_method") || null;
  const date = value(form, "payment_date") || null;
  if (!uuid.test(workerId) || !uuid.test(orderId)) {
    throw new Error("Select an assigned subcontractor and the related work order.");
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountRaw) || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a positive payment amount with at most two decimals.");
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid payment date.");
  const results = await sql`
    SELECT * FROM public.record_verified_subcontract_payment(
      ${workerId}::uuid,${orderId}::uuid,${actor.id}::uuid,
      ${amount}::numeric,${paymentType},${paymentMethod},
      ${value(form, "reference_no") || null},${date}::date,
      ${value(form, "notes") || null}
    )
  `;
  if (!results.length) throw new Error("Subcontractor payment could not be recorded.");
  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/worker-payments");
  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/reports");
}
