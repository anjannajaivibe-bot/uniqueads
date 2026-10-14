"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ACCESS, requireRoles } from "@/lib/auth/permissions";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numberOrNull(value: FormDataEntryValue | null) {
  const text = clean(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
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

export async function addWorkUpdate(formData: FormData) {
  const currentUser = await requireRoles(ACCESS.field);

  const locationId = clean(formData.get("location_id"));
  const updateStatus = clean(formData.get("status"));
  const updateText = clean(formData.get("update_text"));
  const latitude = numberOrNull(formData.get("latitude"));
  const longitude = numberOrNull(formData.get("longitude"));
  const clientApproved = clean(formData.get("client_approved")) === "true";

  const allowed = [
    "started",
    "in_progress",
    "paused",
    "quality_check",
    "issue",
  ];

  if (!locationId || !updateStatus || !allowed.includes(updateStatus)) {
    throw new Error(
      "Location and a valid interim work status are required. Use Live Capture for completion."
    );
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new Error("Invalid latitude.");
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new Error("Invalid longitude.");
  }

  const rows = await sql`
    SELECT
      ol.id,
      ol.order_id,
      ol.location_name,
      ol.progress_percent,
      ol.status,
      o.assigned_supervisor,
      EXISTS (
        SELECT 1
        FROM order_worker_assignments owa
        WHERE owa.order_id = ol.order_id
          AND owa.worker_id = ${currentUser.worker_id}::uuid
          AND owa.released_on IS NULL
          AND (
            owa.order_location_id IS NULL
            OR owa.order_location_id = ol.id
          )
      ) AS worker_assigned
    FROM order_locations ol
    JOIN orders o ON o.id = ol.order_id
    WHERE ol.id = ${locationId}::uuid
    LIMIT 1
  `;

  const location = rows[0] as any;
  if (!location) throw new Error("Work location not found.");

  if (
    currentUser.role === "supervisor" &&
    String(location.assigned_supervisor || "") !== currentUser.id &&
    !Boolean(location.worker_assigned)
  ) {
    throw new Error("This work location is not assigned to your account.");
  }

  if (location.status === "completed") {
    throw new Error("Completed locations cannot receive interim updates.");
  }

  const requestedProgress = numberOrNull(formData.get("progress_percent"));
  const progress = Math.min(
    99,
    Math.max(
      0,
      requestedProgress === null
        ? Number(location.progress_percent || 0)
        : Math.round(requestedProgress)
    )
  );

  const mappedLocationStatus =
    updateStatus === "quality_check"
      ? "quality_check"
      : updateStatus === "issue" || updateStatus === "paused"
        ? "blocked"
        : "in_progress";

  const updateRows = await sql`
    INSERT INTO work_updates (
      order_id,
      order_location_id,
      status,
      progress_percent,
      update_text,
      latitude,
      longitude,
      recorded_at,
      created_by
    ) VALUES (
      ${location.order_id}::uuid,
      ${locationId}::uuid,
      ${updateStatus},
      ${progress},
      ${updateText},
      ${latitude},
      ${longitude},
      now(),
      ${currentUser.id}
    )
    RETURNING id
  `;

  const workUpdateId = String(updateRows[0].id);

  await sql`
    UPDATE order_locations
    SET
      status = ${mappedLocationStatus},
      progress_percent = GREATEST(progress_percent, ${progress}),
      client_approved = ${clientApproved},
      latitude = COALESCE(${latitude}, latitude),
      longitude = COALESCE(${longitude}, longitude),
      updated_at = now()
    WHERE id = ${locationId}::uuid
      AND status <> 'completed'
  `;

  if (updateStatus === "quality_check") {
    await sql`
      UPDATE orders
      SET status = 'quality_check', updated_at = now()
      WHERE id = ${location.order_id}::uuid
        AND status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
    `;
  } else if (updateStatus === "started") {
    await sql`
      UPDATE orders
      SET status = 'work_started', updated_at = now()
      WHERE id = ${location.order_id}::uuid
        AND status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
    `;
  } else if (updateStatus === "in_progress") {
    await sql`
      UPDATE orders
      SET status = 'in_progress', updated_at = now()
      WHERE id = ${location.order_id}::uuid
        AND status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
    `;
  }

  await logOrderActivity(
    currentUser.id,
    String(location.order_id),
    "work_update_added",
    `${location.location_name}: ${updateStatus.replaceAll("_", " ")} at ${progress}%.`,
    {
      work_update_id: workUpdateId,
      order_location_id: locationId,
      status: updateStatus,
      progress_percent: progress,
      client_approved: clientApproved,
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${location.order_id}`);
  revalidatePath("/admin/work-progress");
  revalidatePath(`/admin/work-progress/${locationId}`);
}
