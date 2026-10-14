import { sql } from "@/lib/db";
import type { CurrentAppUser } from "@/lib/auth/authorization";

type WorkScope = Pick<CurrentAppUser, "id" | "role" | "worker_id">;

export async function getWorkProgressOverview(user: WorkScope) {
  const isSupervisor = user.role === "supervisor";

  return sql`
    SELECT
      ol.id,
      ol.order_id,
      ol.location_name,
      ol.state,
      ol.district,
      ol.city,
      ol.road,
      ol.landmark,
      ol.wall_size,
      ol.area_sqft,
      ol.quantity,
      ol.planned_date,
      ol.completed_date,
      ol.status,
      ol.progress_percent,
      ol.client_approved,
      o.order_no,
      o.campaign_name,
      o.status AS order_status,
      o.due_date,
      c.company_name,
      COALESCE(p.photo_count, 0)::int AS photo_count,
      COALESCE(p.before_count, 0)::int AS before_count,
      COALESCE(p.during_count, 0)::int AS during_count,
      COALESCE(p.completed_count, 0)::int AS completed_photo_count,
      u.latest_update_at,
      u.latest_update_text
    FROM order_locations ol
    JOIN orders o ON o.id = ol.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN (
      SELECT
        order_location_id,
        count(*) AS photo_count,
        count(*) FILTER (WHERE photo_type = 'before') AS before_count,
        count(*) FILTER (WHERE photo_type = 'during') AS during_count,
        count(*) FILTER (WHERE photo_type = 'completed') AS completed_count
      FROM work_photos
      GROUP BY order_location_id
    ) p ON p.order_location_id = ol.id
    LEFT JOIN (
      SELECT DISTINCT ON (order_location_id)
        order_location_id,
        recorded_at AS latest_update_at,
        update_text AS latest_update_text
      FROM work_updates
      WHERE order_location_id IS NOT NULL
      ORDER BY order_location_id, recorded_at DESC
    ) u ON u.order_location_id = ol.id
    WHERE o.status <> 'cancelled'
      AND ol.status <> 'cancelled'
      AND (
        ${!isSupervisor}::boolean
        OR o.assigned_supervisor = ${user.id}::uuid
        OR (
          ${user.worker_id}::uuid IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM order_worker_assignments owa
            WHERE owa.order_id = o.id
              AND owa.worker_id = ${user.worker_id}::uuid
              AND owa.released_on IS NULL
              AND (
                owa.order_location_id IS NULL
                OR owa.order_location_id = ol.id
              )
          )
        )
      )
    ORDER BY
      CASE
        WHEN ol.status = 'blocked' THEN 0
        WHEN ol.status = 'in_progress' THEN 1
        WHEN ol.status = 'quality_check' THEN 2
        WHEN ol.status = 'assigned' THEN 3
        WHEN ol.status = 'pending' THEN 4
        WHEN ol.status = 'completed' THEN 5
        ELSE 6
      END,
      o.due_date NULLS LAST,
      o.created_at DESC,
      ol.created_at
    LIMIT 600
  `;
}

export async function getWorkProgressCounts(user: WorkScope) {
  const isSupervisor = user.role === "supervisor";

  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE ol.status IN ('pending', 'assigned'))::int AS waiting_count,
      count(*) FILTER (WHERE ol.status = 'in_progress')::int AS in_progress_count,
      count(*) FILTER (WHERE ol.status = 'quality_check')::int AS quality_count,
      count(*) FILTER (WHERE ol.status = 'blocked')::int AS blocked_count,
      count(*) FILTER (WHERE ol.status = 'completed')::int AS completed_count,
      ROUND(COALESCE(AVG(ol.progress_percent) FILTER (
        WHERE ol.status <> 'cancelled'
      ), 0))::int AS average_progress
    FROM order_locations ol
    JOIN orders o ON o.id = ol.order_id
    WHERE o.status <> 'cancelled'
      AND (
        ${!isSupervisor}::boolean
        OR o.assigned_supervisor = ${user.id}::uuid
        OR (
          ${user.worker_id}::uuid IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM order_worker_assignments owa
            WHERE owa.order_id = o.id
              AND owa.worker_id = ${user.worker_id}::uuid
              AND owa.released_on IS NULL
              AND (
                owa.order_location_id IS NULL
                OR owa.order_location_id = ol.id
              )
          )
        )
      )
  `;
  return rows[0];
}

export async function getWorkLocation(id: string, user: WorkScope) {
  const isSupervisor = user.role === "supervisor";

  const rows = await sql`
    SELECT
      ol.*,
      o.order_no,
      o.campaign_name,
      o.status AS order_status,
      o.due_date,
      o.work_instructions,
      c.company_name,
      c.contact_person,
      c.phone,
      s.full_name AS supervisor_name
    FROM order_locations ol
    JOIN orders o ON o.id = ol.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN app_users s ON s.id = o.assigned_supervisor
    WHERE ol.id = ${id}::uuid
      AND (
        ${!isSupervisor}::boolean
        OR o.assigned_supervisor = ${user.id}::uuid
        OR (
          ${user.worker_id}::uuid IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM order_worker_assignments owa
            WHERE owa.order_id = o.id
              AND owa.worker_id = ${user.worker_id}::uuid
              AND owa.released_on IS NULL
              AND (
                owa.order_location_id IS NULL
                OR owa.order_location_id = ol.id
              )
          )
        )
      )
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getWorkUpdates(locationId: string) {
  return sql`
    SELECT
      wu.id,
      wu.status,
      wu.progress_percent,
      wu.update_text,
      wu.latitude,
      wu.longitude,
      wu.recorded_at,
      u.full_name AS created_by_name
    FROM work_updates wu
    LEFT JOIN app_users u ON u.id = wu.created_by
    WHERE wu.order_location_id = ${locationId}::uuid
    ORDER BY wu.recorded_at DESC
    LIMIT 250
  `;
}

export async function getWorkPhotos(locationId: string) {
  return sql`
    SELECT
      wp.id,
      wp.photo_type,
      wp.file_url,
      wp.thumbnail_url,
      wp.caption,
      wp.latitude,
      wp.longitude,
      wp.captured_at,
      wp.device_captured_at,
      wp.gps_accuracy_m,
      wp.captured_by_username,
      wp.is_live_capture,
      wp.created_at,
      u.full_name AS uploaded_by_name
    FROM work_photos wp
    LEFT JOIN app_users u ON u.id = wp.uploaded_by
    WHERE wp.order_location_id = ${locationId}::uuid
    ORDER BY
      CASE wp.photo_type
        WHEN 'quality_issue' THEN 1
        WHEN 'completed' THEN 2
        WHEN 'during' THEN 3
        WHEN 'before' THEN 4
        ELSE 5
      END,
      COALESCE(wp.device_captured_at, wp.captured_at, wp.created_at) DESC
    LIMIT 300
  `;
}

export async function getLocationWorkers(locationId: string, orderId: string) {
  return sql`
    SELECT DISTINCT
      w.id,
      w.worker_code,
      w.name,
      w.phone,
      w.skill,
      owa.role_on_job
    FROM order_worker_assignments owa
    JOIN workers w ON w.id = owa.worker_id
    WHERE owa.order_id = ${orderId}::uuid
      AND (
        owa.order_location_id = ${locationId}::uuid
        OR owa.order_location_id IS NULL
      )
      AND owa.released_on IS NULL
    ORDER BY w.name
  `;
}
