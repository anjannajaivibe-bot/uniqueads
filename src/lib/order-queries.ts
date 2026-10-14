import { sql } from "@/lib/db";
import type { CurrentAppUser } from "@/lib/auth/authorization";

type OrderScope = Pick<CurrentAppUser, "id" | "role" | "worker_id">;

export async function getOrderList(user: OrderScope) {
  const isSupervisor = user.role === "supervisor";

  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.advertising_type,
      o.start_date,
      o.due_date,
      o.completed_date,
      o.status,
      o.total_order_amount,
      o.advance_received,
      o.created_at,
      c.company_name,
      c.contact_person,
      c.phone,
      s.full_name AS supervisor_name,
      COALESCE(loc.location_count, 0)::int AS location_count,
      COALESCE(loc.completed_locations, 0)::int AS completed_locations,
      COALESCE(loc.progress_percent, 0)::int AS progress_percent
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN app_users s ON s.id = o.assigned_supervisor
    LEFT JOIN (
      SELECT
        order_id,
        count(*) AS location_count,
        count(*) FILTER (WHERE status = 'completed') AS completed_locations,
        ROUND(COALESCE(AVG(progress_percent), 0)) AS progress_percent
      FROM order_locations
      GROUP BY order_id
    ) loc ON loc.order_id = o.id
    WHERE (
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
        )
      )
    )
    ORDER BY
      CASE
        WHEN o.due_date IS NOT NULL
         AND o.due_date < CURRENT_DATE
         AND o.status NOT IN ('completed', 'invoiced', 'closed', 'cancelled') THEN 0
        ELSE 1
      END,
      o.due_date NULLS LAST,
      o.created_at DESC
    LIMIT 500
  `;
}

export async function getOrderCounts(user: OrderScope) {
  const isSupervisor = user.role === "supervisor";

  const rows = await sql`
    SELECT
      count(*) FILTER (
        WHERE o.status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
      )::int AS active_count,
      count(*) FILTER (
        WHERE o.due_date IS NOT NULL
          AND o.due_date < CURRENT_DATE
          AND o.status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
      )::int AS overdue_count,
      count(*) FILTER (
        WHERE o.status IN ('completed', 'invoiced', 'closed')
          AND COALESCE(o.completed_date, o.updated_at::date)
              >= date_trunc('month', CURRENT_DATE)::date
          AND COALESCE(o.completed_date, o.updated_at::date)
              < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
      )::int AS completed_month_count,
      COALESCE(sum(o.total_order_amount) FILTER (
        WHERE o.created_at >= date_trunc('month', now())
          AND o.created_at < date_trunc('month', now()) + interval '1 month'
      ), 0) AS month_order_value
    FROM orders o
    WHERE (
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
        )
      )
    )
  `;
  return rows[0];
}

export async function getOrderById(id: string, user: OrderScope) {
  const isSupervisor = user.role === "supervisor";

  const rows = await sql`
    SELECT
      o.*,
      c.customer_code,
      c.company_name,
      c.contact_person,
      c.phone,
      c.whatsapp,
      c.email,
      c.gstin,
      c.billing_address,
      c.city,
      c.state,
      c.pincode,
      q.quotation_no,
      s.full_name AS supervisor_name,
      creator.full_name AS created_by_name
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN quotations q ON q.id = o.quotation_id
    LEFT JOIN app_users s ON s.id = o.assigned_supervisor
    LEFT JOIN app_users creator ON creator.id = o.created_by
    WHERE o.id = ${id}::uuid
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
          )
        )
      )
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getOrderLocations(orderId: string) {
  return sql`
    SELECT
      ol.*,
      COALESCE(assign.worker_count, 0)::int AS worker_count
    FROM order_locations ol
    LEFT JOIN (
      SELECT
        order_location_id,
        count(DISTINCT worker_id) FILTER (WHERE released_on IS NULL) AS worker_count
      FROM order_worker_assignments
      WHERE order_location_id IS NOT NULL
      GROUP BY order_location_id
    ) assign ON assign.order_location_id = ol.id
    WHERE ol.order_id = ${orderId}::uuid
    ORDER BY
      CASE ol.status
        WHEN 'in_progress' THEN 1
        WHEN 'assigned' THEN 2
        WHEN 'pending' THEN 3
        WHEN 'quality_check' THEN 4
        WHEN 'blocked' THEN 5
        WHEN 'completed' THEN 6
        ELSE 7
      END,
      ol.planned_date NULLS LAST,
      ol.created_at
  `;
}

export async function getOrderAssignments(orderId: string) {
  return sql`
    SELECT
      owa.id,
      owa.order_id,
      owa.order_location_id,
      owa.worker_id,
      owa.role_on_job,
      owa.agreed_payment_mode,
      owa.agreed_rate,
      owa.agreed_amount,
      owa.assigned_on,
      owa.released_on,
      owa.notes,
      w.worker_code,
      w.name AS worker_name,
      w.phone AS worker_phone,
      w.skill AS worker_skill,
      ol.location_name
    FROM order_worker_assignments owa
    JOIN workers w ON w.id = owa.worker_id
    LEFT JOIN order_locations ol ON ol.id = owa.order_location_id
    WHERE owa.order_id = ${orderId}::uuid
    ORDER BY owa.assigned_on DESC, w.name
  `;
}

export async function getOrderActivity(orderId: string) {
  return sql`
    SELECT
      a.id,
      a.action,
      a.description,
      a.metadata,
      a.created_at,
      u.full_name AS actor_name
    FROM activity_logs a
    LEFT JOIN app_users u ON u.id = a.actor_user_id
    WHERE a.entity_type = 'order'
      AND a.entity_id = ${orderId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 250
  `;
}

export async function getOrderSupervisors() {
  return sql`
    SELECT id, full_name, email, role
    FROM app_users
    WHERE is_active = true
      AND role IN ('super_admin', 'operations_manager', 'supervisor')
    ORDER BY full_name
  `;
}

export async function getActiveWorkers() {
  return sql`
    SELECT
      id,
      worker_code,
      name,
      phone,
      skill,
      payment_mode,
      default_rate
    FROM workers
    WHERE is_active = true
    ORDER BY name
    LIMIT 1000
  `;
}
