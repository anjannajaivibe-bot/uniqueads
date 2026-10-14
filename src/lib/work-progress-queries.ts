import { sql } from "@/lib/db";

export async function getWorkProgressOverview() {
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
    LEFT JOIN LATERAL (
      SELECT
        count(*) AS photo_count,
        count(*) FILTER (WHERE wp.photo_type = 'before') AS before_count,
        count(*) FILTER (WHERE wp.photo_type = 'during') AS during_count,
        count(*) FILTER (WHERE wp.photo_type = 'completed') AS completed_count
      FROM work_photos wp
      WHERE wp.order_location_id = ol.id
    ) p ON true
    LEFT JOIN LATERAL (
      SELECT
        wu.recorded_at AS latest_update_at,
        wu.update_text AS latest_update_text
      FROM work_updates wu
      WHERE wu.order_location_id = ol.id
      ORDER BY wu.recorded_at DESC
      LIMIT 1
    ) u ON true
    WHERE o.status <> 'cancelled'
      AND ol.status <> 'cancelled'
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

export async function getWorkProgressCounts() {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE status IN ('pending', 'assigned'))::int AS waiting_count,
      count(*) FILTER (WHERE status = 'in_progress')::int AS in_progress_count,
      count(*) FILTER (WHERE status = 'quality_check')::int AS quality_count,
      count(*) FILTER (WHERE status = 'blocked')::int AS blocked_count,
      count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
      ROUND(COALESCE(AVG(progress_percent) FILTER (
        WHERE status <> 'cancelled'
      ), 0))::int AS average_progress
    FROM order_locations
  `;
  return rows[0];
}

export async function getWorkLocation(id: string) {
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
      COALESCE(wp.captured_at, wp.created_at) DESC
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
