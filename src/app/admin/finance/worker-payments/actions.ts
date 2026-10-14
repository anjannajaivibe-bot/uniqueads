"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nonNegativeNumber(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
}

function paymentNumber() {
  return `UA-WPAY-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function logWorkerActivity(actorUserId: string, workerId: string, action: string, description: string, metadata: Record<string, unknown> = {}) {
  await sql`INSERT INTO activity_logs(actor_user_id, action, entity_type, entity_id, description, metadata)
    VALUES (${actorUserId},${action},'worker',${workerId}::uuid,${description},${JSON.stringify(metadata)})`;
}

export async function addWorkerPayment(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.finance);

  const workerId = clean(formData.get("worker_id"));
  const amount = nonNegativeNumber(formData.get("amount"));
  const paymentType = clean(formData.get("payment_type")) ?? "progress";
  const paymentMethod = clean(formData.get("payment_method"));

  const allowedTypes = ["advance", "progress", "final", "adjustment"];
  const allowedMethods = ["cash", "bank_transfer", "upi", "cheque", "other"];

  if (!workerId || !amount || amount <= 0) {
    throw new Error("Worker and a payment amount greater than zero are required.");
  }
  if (!allowedTypes.includes(paymentType)) throw new Error("Invalid payment type.");
  if (paymentMethod && !allowedMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  const orderId = clean(formData.get("order_id"));
  let locationId = clean(formData.get("order_location_id"));

  if (locationId && orderId) {
    const validLocation = await sql`
      SELECT id
      FROM order_locations
      WHERE id = ${locationId}::uuid
        AND order_id = ${orderId}::uuid
      LIMIT 1
    `;
    if (validLocation.length === 0) locationId = null;
  } else {
    locationId = null;
  }

  const paymentNo = paymentNumber();

  await sql`
    INSERT INTO worker_payments (
      payment_no,
      worker_id,
      order_id,
      order_location_id,
      payment_date,
      payment_type,
      amount,
      payment_method,
      reference_no,
      notes,
      paid_by
    ) VALUES (
      ${paymentNo},
      ${workerId}::uuid,
      ${orderId},
      ${locationId},
      ${clean(formData.get("payment_date")) ?? new Date().toISOString().slice(0, 10)},
      ${paymentType},
      ${amount},
      ${paymentMethod},
      ${clean(formData.get("reference_no"))},
      ${clean(formData.get("notes"))},
      ${currentUser.id}
    )
  `;

  await logWorkerActivity(
    currentUser.id,
    workerId,
    "worker_payment_added",
    `Worker payment ${paymentNo} recorded.`,
    {
      payment_no: paymentNo,
      amount,
      order_id: orderId,
      payment_type: paymentType,
    }
  );

  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/worker-payments");
}

