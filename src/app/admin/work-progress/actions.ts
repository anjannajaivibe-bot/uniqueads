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
    "completed",
    "issue",
  ];

  if (!locationId || !updateStatus || !allowed.includes(updateStatus)) {
    throw new Error("Location and a valid work status are required.");
  }

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new Error("Invalid latitude.");
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new Error("Invalid longitude.");
  }

  const rows = await sql`
    SELECT id, order_id, location_name, progress_percent
    FROM order_locations
    WHERE id = ${locationId}::uuid
    LIMIT 1
  `;

  const location = rows[0] as any;
  if (!location) throw new Error("Work location not found.");

  const requestedProgress = numberOrNull(formData.get("progress_percent"));
  const progress =
    updateStatus === "completed"
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            requestedProgress === null
              ? Number(location.progress_percent || 0)
              : Math.round(requestedProgress)
          )
        );

  const mappedLocationStatus =
    updateStatus === "completed"
      ? "completed"
      : updateStatus === "quality_check"
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
      progress_percent = ${progress},
      client_approved = ${clientApproved},
      latitude = COALESCE(${latitude}, latitude),
      longitude = COALESCE(${longitude}, longitude),
      completed_date = CASE
        WHEN ${mappedLocationStatus} = 'completed'
          THEN COALESCE(completed_date, CURRENT_DATE)
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = ${locationId}::uuid
  `;

  const statsRows = await sql`
    SELECT
      count(*) FILTER (WHERE status <> 'cancelled')::int AS active_locations,
      count(*) FILTER (WHERE status = 'completed')::int AS completed_locations,
      count(*) FILTER (WHERE status = 'quality_check')::int AS quality_locations,
      count(*) FILTER (WHERE status = 'in_progress')::int AS active_work_locations
    FROM order_locations
    WHERE order_id = ${location.order_id}::uuid
  `;

  const stats = statsRows[0] as any;
  const allCompleted =
    Number(stats.active_locations || 0) > 0 &&
    Number(stats.completed_locations || 0) === Number(stats.active_locations || 0);

  if (allCompleted) {
    await sql`
      UPDATE orders
      SET status = 'completed',
          completed_date = COALESCE(completed_date, CURRENT_DATE),
          updated_at = now()
      WHERE id = ${location.order_id}::uuid
    `;
  } else if (updateStatus === "quality_check") {
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

