import { sql } from "@/lib/db";

export async function getWorkerList() {
  return sql`
    SELECT
      w.id,
      w.worker_code,
      w.name,
      w.phone,
      w.skill,
      w.state,
      w.payment_mode,
      w.default_rate,
      w.joined_on,
      w.is_active,
      w.created_at,
      COALESCE(a.active_assignments, 0)::int AS active_assignments,
      COALESCE(a.agreed_total, 0) AS agreed_total,
      COALESCE(p.paid_total, 0) AS paid_total
    FROM workers w
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE owa.released_on IS NULL) AS active_assignments,
        COALESCE(sum(owa.agreed_amount), 0) AS agreed_total
      FROM order_worker_assignments owa
      WHERE owa.worker_id = w.id
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(wp.amount), 0) AS paid_total
      FROM worker_payments wp
      WHERE wp.worker_id = w.id
    ) p ON true
    ORDER BY
      CASE WHEN w.is_active THEN 0 ELSE 1 END,
      w.name
    LIMIT 1000
  `;
}

export async function getWorkerCounts() {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE is_active = true)::int AS active_count,
      count(*) FILTER (WHERE is_active = true AND skill = 'painter')::int AS painter_count,
      count(*) FILTER (WHERE is_active = true AND skill = 'helper')::int AS helper_count,
      count(*) FILTER (WHERE is_active = true AND skill = 'supervisor')::int AS supervisor_count
    FROM workers
  `;
  return rows[0];
}

export async function getWorkerById(id: string) {
  const rows = await sql`
    SELECT
      w.*,
      COALESCE(a.agreed_total, 0) AS agreed_total,
      COALESCE(p.paid_total, 0) AS paid_total
    FROM workers w
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(owa.agreed_amount), 0) AS agreed_total
      FROM order_worker_assignments owa
      WHERE owa.worker_id = w.id
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(wp.amount), 0) AS paid_total
      FROM worker_payments wp
      WHERE wp.worker_id = w.id
    ) p ON true
    WHERE w.id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getWorkerAssignments(workerId: string) {
  return sql`
    SELECT
      owa.id,
      owa.assigned_on,
      owa.released_on,
      owa.role_on_job,
      owa.agreed_payment_mode,
      owa.agreed_rate,
      owa.agreed_amount,
      owa.notes,
      o.id AS order_id,
      o.order_no,
      o.campaign_name,
      o.status AS order_status,
      c.company_name,
      ol.location_name
    FROM order_worker_assignments owa
    JOIN orders o ON o.id = owa.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_locations ol ON ol.id = owa.order_location_id
    WHERE owa.worker_id = ${workerId}::uuid
    ORDER BY owa.assigned_on DESC, o.created_at DESC
    LIMIT 250
  `;
}

export async function getWorkerPayments(workerId: string) {
  return sql`
    SELECT
      wp.id,
      wp.payment_no,
      wp.payment_date,
      wp.payment_type,
      wp.amount,
      wp.payment_method,
      wp.reference_no,
      wp.notes,
      o.order_no,
      o.id AS order_id,
      ol.location_name,
      u.full_name AS paid_by_name
    FROM worker_payments wp
    LEFT JOIN orders o ON o.id = wp.order_id
    LEFT JOIN order_locations ol ON ol.id = wp.order_location_id
    LEFT JOIN app_users u ON u.id = wp.paid_by
    WHERE wp.worker_id = ${workerId}::uuid
    ORDER BY wp.payment_date DESC, wp.created_at DESC
    LIMIT 250
  `;
}

export async function getWorkerOrderOptions(workerId: string) {
  return sql`
    SELECT DISTINCT
      o.id,
      o.order_no,
      o.campaign_name
    FROM order_worker_assignments owa
    JOIN orders o ON o.id = owa.order_id
    WHERE owa.worker_id = ${workerId}::uuid
      AND o.status <> 'cancelled'
    ORDER BY o.order_no DESC
  `;
}

export async function getWorkerActivity(workerId: string) {
  return sql`
    SELECT
      a.id,
      a.action,
      a.description,
      a.created_at,
      u.full_name AS actor_name
    FROM activity_logs a
    LEFT JOIN app_users u ON u.id = a.actor_user_id
    WHERE a.entity_type = 'worker'
      AND a.entity_id = ${workerId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 200
  `;
}
