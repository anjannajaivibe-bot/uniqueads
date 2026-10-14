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

function nonNegativeNumber(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : null;
}

function workerCode() {
  return `UA-WRK-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function paymentNumber() {
  return `UA-WPAY-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

async function logWorkerActivity(
  actorUserId: string,
  workerId: string,
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
      'worker',
      ${workerId}::uuid,
      ${description},
      ${JSON.stringify(metadata)}
    )
  `;
}

export async function createWorker(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const name = clean(formData.get("name"));
  const skill = clean(formData.get("skill")) ?? "painter";
  const paymentMode = clean(formData.get("payment_mode")) ?? "daily";

  const allowedSkills = [
    "painter",
    "helper",
    "supervisor",
    "driver",
    "installer",
    "other",
  ];
  const allowedPaymentModes = [
    "daily",
    "per_wall",
    "per_sqft",
    "fixed",
    "milestone",
  ];

  if (!name) throw new Error("Worker name is required.");
  if (!allowedSkills.includes(skill)) throw new Error("Invalid worker skill.");
  if (!allowedPaymentModes.includes(paymentMode)) throw new Error("Invalid payment mode.");

  const code = workerCode();

  const rows = await sql`
    INSERT INTO workers (
      worker_code,
      name,
      phone,
      address,
      skill,
      state,
      bank_account_name,
      bank_account_number,
      ifsc_code,
      upi_id,
      payment_mode,
      default_rate,
      joined_on,
      is_active
    ) VALUES (
      ${code},
      ${name},
      ${clean(formData.get("phone"))},
      ${clean(formData.get("address"))},
      ${skill},
      ${clean(formData.get("state"))},
      ${clean(formData.get("bank_account_name"))},
      ${clean(formData.get("bank_account_number"))},
      ${clean(formData.get("ifsc_code"))},
      ${clean(formData.get("upi_id"))},
      ${paymentMode},
      ${nonNegativeNumber(formData.get("default_rate"))},
      ${clean(formData.get("joined_on"))},
      true
    )
    RETURNING id
  `;

  const workerId = String(rows[0].id);

  await logWorkerActivity(
    currentUser.id,
    workerId,
    "worker_created",
    `Worker ${name} created.`,
    { worker_code: code, skill, payment_mode: paymentMode }
  );

  revalidatePath("/admin/workers");
  revalidatePath("/admin/orders");
  redirect(`/admin/workers/${workerId}`);
}

export async function updateWorker(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const workerId = clean(formData.get("worker_id"));
  const name = clean(formData.get("name"));
  const skill = clean(formData.get("skill"));
  const paymentMode = clean(formData.get("payment_mode"));

  const allowedSkills = [
    "painter",
    "helper",
    "supervisor",
    "driver",
    "installer",
    "other",
  ];
  const allowedPaymentModes = [
    "daily",
    "per_wall",
    "per_sqft",
    "fixed",
    "milestone",
  ];

  if (!workerId || !name || !skill || !paymentMode) {
    throw new Error("Worker ID, name, skill and payment mode are required.");
  }
  if (!allowedSkills.includes(skill)) throw new Error("Invalid worker skill.");
  if (!allowedPaymentModes.includes(paymentMode)) throw new Error("Invalid payment mode.");

  await sql`
    UPDATE workers
    SET
      name = ${name},
      phone = ${clean(formData.get("phone"))},
      address = ${clean(formData.get("address"))},
      skill = ${skill},
      state = ${clean(formData.get("state"))},
      bank_account_name = ${clean(formData.get("bank_account_name"))},
      bank_account_number = ${clean(formData.get("bank_account_number"))},
      ifsc_code = ${clean(formData.get("ifsc_code"))},
      upi_id = ${clean(formData.get("upi_id"))},
      payment_mode = ${paymentMode},
      default_rate = ${nonNegativeNumber(formData.get("default_rate"))},
      joined_on = ${clean(formData.get("joined_on"))},
      updated_at = now()
    WHERE id = ${workerId}::uuid
  `;

  await logWorkerActivity(
    currentUser.id,
    workerId,
    "worker_updated",
    "Worker details updated."
  );

  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/orders");
}

export async function toggleWorkerActive(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

  const workerId = clean(formData.get("worker_id"));
  const nextActive = clean(formData.get("next_active")) === "true";

  if (!workerId) throw new Error("Worker ID is required.");

  const rows = await sql`
    UPDATE workers
    SET is_active = ${nextActive}, updated_at = now()
    WHERE id = ${workerId}::uuid
    RETURNING name
  `;

  const name = rows[0]?.name ? String(rows[0].name) : "Worker";

  await logWorkerActivity(
    currentUser.id,
    workerId,
    nextActive ? "worker_reactivated" : "worker_deactivated",
    `${name} ${nextActive ? "reactivated" : "deactivated"}.`
  );

  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${workerId}`);
  revalidatePath("/admin/orders");
}

export async function addWorkerPayment(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);

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
}

