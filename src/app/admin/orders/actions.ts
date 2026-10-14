"use server";

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
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 100) / 100
    : null;
}

function nonNegativeInteger(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function logOrderActivity(
  actorUserId: string,
  orderId: string,
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
      'order',
      ${orderId}::uuid,
      ${description},
      ${JSON.stringify(metadata)}
    )
  `;
}

export async function updateOrder(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);
  const orderId = clean(formData.get("order_id"));
  const campaignName = clean(formData.get("campaign_name"));

  if (!orderId || !campaignName) {
    throw new Error("Order ID and campaign name are required.");
  }

  await sql`
    UPDATE orders
    SET
      campaign_name = ${campaignName},
      advertising_type = ${clean(formData.get("advertising_type"))},
      start_date = ${clean(formData.get("start_date"))},
      due_date = ${clean(formData.get("due_date"))},
      assigned_supervisor = ${clean(formData.get("assigned_supervisor"))},
      work_instructions = ${clean(formData.get("work_instructions"))},
      updated_at = now()
    WHERE id = ${orderId}::uuid
  `;

  await logOrderActivity(
    currentUser.id,
    orderId,
    "order_updated",
    "Order planning details updated."
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateOrderStatus(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);
  const orderId = clean(formData.get("order_id"));
  const status = clean(formData.get("status"));

  const allowed = [
    "order_received",
    "planning",
    "team_assigned",
    "material_ready",
    "work_started",
    "in_progress",
    "quality_check",
    "customer_approval",
    "completed",
    "invoiced",
    "closed",
    "cancelled",
  ];

  if (!orderId || !status || !allowed.includes(status)) {
    throw new Error("Invalid order status.");
  }

  const integrityRows = await sql`
    SELECT
      count(ol.id) FILTER (WHERE ol.status <> 'cancelled')::int AS active_locations,
      count(ol.id) FILTER (WHERE ol.status <> 'cancelled' AND ol.status <> 'completed')::int AS incomplete_locations,
      count(i.id) FILTER (WHERE i.status <> 'cancelled')::int AS invoice_count,
      COALESCE(sum(GREATEST(i.total_amount - i.amount_paid, 0)) FILTER (WHERE i.status <> 'cancelled'), 0) AS invoice_outstanding
    FROM orders o
    LEFT JOIN order_locations ol ON ol.order_id = o.id
    LEFT JOIN invoices i ON i.order_id = o.id
    WHERE o.id = ${orderId}::uuid
    GROUP BY o.id
  `;

  const integrity = integrityRows[0] as any;
  if (!integrity) throw new Error("Order not found.");

  if (status === "completed") {
    if (Number(integrity.active_locations || 0) === 0) {
      throw new Error("Add at least one campaign location before completing the order.");
    }
    if (Number(integrity.incomplete_locations || 0) > 0) {
      throw new Error(
        "Every active location must be completed through Live Photo Capture before the order can be completed."
      );
    }
  }

  if (status === "invoiced" && Number(integrity.invoice_count || 0) === 0) {
    throw new Error("Create an invoice before marking the order invoiced.");
  }

  if (status === "closed") {
    if (Number(integrity.active_locations || 0) === 0 || Number(integrity.incomplete_locations || 0) > 0) {
      throw new Error("Complete all campaign locations before closing the order.");
    }
    if (Number(integrity.invoice_count || 0) === 0) {
      throw new Error("An invoice is required before closing the order.");
    }
    if (Number(integrity.invoice_outstanding || 0) > 0) {
      throw new Error("Outstanding invoice balance must be cleared before closing the order.");
    }
  }

  await sql`
    UPDATE orders
    SET
      status = ${status},
      completed_date = CASE
        WHEN ${status} IN ('completed', 'invoiced', 'closed')
          THEN COALESCE(completed_date, CURRENT_DATE)
        WHEN ${status} NOT IN ('completed', 'invoiced', 'closed')
          THEN NULL
        ELSE completed_date
      END,
      updated_at = now()
    WHERE id = ${orderId}::uuid
  `;

  await logOrderActivity(
    currentUser.id,
    orderId,
    "order_status_changed",
    `Order status changed to ${status.replaceAll("_", " ")}.`,
    { status }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/work-progress");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function addOrderLocation(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);
  const orderId = clean(formData.get("order_id"));
  const locationName = clean(formData.get("location_name"));

  if (!orderId || !locationName) {
    throw new Error("Order and location name are required.");
  }

  const rows = await sql`
    INSERT INTO order_locations (
      order_id,
      location_name,
      state,
      district,
      city,
      road,
      landmark,
      latitude,
      longitude,
      wall_size,
      area_sqft,
      quantity,
      planned_date,
      status,
      progress_percent,
      notes
    ) VALUES (
      ${orderId}::uuid,
      ${locationName},
      ${clean(formData.get("state"))},
      ${clean(formData.get("district"))},
      ${clean(formData.get("city"))},
      ${clean(formData.get("road"))},
      ${clean(formData.get("landmark"))},
      ${nonNegativeNumber(formData.get("latitude"))},
      ${nonNegativeNumber(formData.get("longitude"))},
      ${clean(formData.get("wall_size"))},
      ${nonNegativeNumber(formData.get("area_sqft"))},
      ${nonNegativeInteger(formData.get("quantity")) ?? 1},
      ${clean(formData.get("planned_date"))},
      'pending',
      0,
      ${clean(formData.get("notes"))}
    )
    RETURNING id
  `;

  const locationId = String(rows[0].id);

  await logOrderActivity(
    currentUser.id,
    orderId,
    "order_location_added",
    `Location "${locationName}" added to the order.`,
    { order_location_id: locationId, location_name: locationName }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/work-progress");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function updateOrderLocation(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);
  const orderId = clean(formData.get("order_id"));
  const locationId = clean(formData.get("location_id"));
  const status = clean(formData.get("status"));
  const progress = nonNegativeInteger(formData.get("progress_percent"));

  const allowed = [
    "pending",
    "assigned",
    "in_progress",
    "quality_check",
    "blocked",
    "cancelled",
  ];

  if (!orderId || !locationId || !status || !allowed.includes(status)) {
    throw new Error("Invalid location update.");
  }

  const safeProgress = Math.min(99, Math.max(0, progress ?? 0));

  const rows = await sql`
    UPDATE order_locations
    SET
      status = ${status},
      progress_percent = ${safeProgress},
      completed_date = NULL,
      client_approved = ${clean(formData.get("client_approved")) === "true"},
      notes = ${clean(formData.get("notes"))},
      updated_at = now()
    WHERE id = ${locationId}::uuid
      AND order_id = ${orderId}::uuid
    RETURNING location_name
  `;

  const locationName = rows[0]?.location_name
    ? String(rows[0].location_name)
    : "Location";

  await logOrderActivity(
    currentUser.id,
    orderId,
    "order_location_updated",
    `${locationName} updated to ${status.replaceAll("_", " ")} (${safeProgress}%).`,
    {
      order_location_id: locationId,
      status,
      progress_percent: safeProgress,
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/work-progress");
  revalidatePath(`/admin/orders/${orderId}`);
}

export async function assignWorkerToOrder(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.operations);
  const orderId = clean(formData.get("order_id"));
  const workerId = clean(formData.get("worker_id"));
  const locationId = clean(formData.get("order_location_id"));

  if (!orderId || !workerId) {
    throw new Error("Order and worker are required.");
  }

  const paymentMode = clean(formData.get("agreed_payment_mode"));
  const allowedModes = ["daily", "per_wall", "per_sqft", "fixed", "milestone"];

  if (paymentMode && !allowedModes.includes(paymentMode)) {
    throw new Error("Invalid worker payment mode.");
  }

  const existing = await sql`
    SELECT id
    FROM order_worker_assignments
    WHERE order_id = ${orderId}::uuid
      AND worker_id = ${workerId}::uuid
      AND (
        (${locationId}::text IS NULL AND order_location_id IS NULL)
        OR order_location_id = ${locationId}::uuid
      )
    LIMIT 1
  `;

  if (existing.length > 0) {
    throw new Error("This worker is already assigned to the selected order/location.");
  }

  const workerRows = await sql`
    SELECT name
    FROM workers
    WHERE id = ${workerId}::uuid
      AND is_active = true
    LIMIT 1
  `;

  if (workerRows.length === 0) {
    throw new Error("Worker not found or inactive.");
  }

  await sql`
    INSERT INTO order_worker_assignments (
      order_id,
      order_location_id,
      worker_id,
      role_on_job,
      agreed_payment_mode,
      agreed_rate,
      agreed_amount,
      assigned_on,
      notes,
      created_by
    ) VALUES (
      ${orderId}::uuid,
      ${locationId},
      ${workerId}::uuid,
      ${clean(formData.get("role_on_job"))},
      ${paymentMode},
      ${nonNegativeNumber(formData.get("agreed_rate"))},
      ${nonNegativeNumber(formData.get("agreed_amount"))},
      CURRENT_DATE,
      ${clean(formData.get("notes"))},
      ${currentUser.id}
    )
  `;

  if (locationId) {
    await sql`
      UPDATE order_locations
      SET
        status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
        updated_at = now()
      WHERE id = ${locationId}::uuid
        AND order_id = ${orderId}::uuid
    `;
  }

  const workerName = String(workerRows[0].name);

  await logOrderActivity(
    currentUser.id,
    orderId,
    "worker_assigned",
    `${workerName} assigned to the order${locationId ? " location" : ""}.`,
    { worker_id: workerId, order_location_id: locationId }
  );

  revalidatePath("/admin/orders");
  revalidatePath("/admin/work-progress");
  revalidatePath(`/admin/orders/${orderId}`);
}

