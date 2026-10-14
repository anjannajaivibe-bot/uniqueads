import { sql } from "@/lib/db";
import type { CurrentAppUser } from "@/lib/auth/authorization";

export async function getDashboardMetrics(
  user: Pick<CurrentAppUser, "id" | "role" | "worker_id">
) {
  const role = user.role;
  const showSales = ["super_admin", "operations_manager", "sales"].includes(role);
  const showField = ["super_admin", "operations_manager", "supervisor"].includes(role);
  const showOperationsValue = ["super_admin", "operations_manager", "accounts"].includes(role);
  const showFinance = ["super_admin", "accounts"].includes(role);
  const isSupervisor = role === "supervisor";

  const rows = await sql`
    SELECT
      CASE WHEN ${showSales}::boolean THEN
        (SELECT count(*)::int
         FROM leads
         WHERE status IN ('new','contacted','requirement_received','quotation_sent','negotiation'))
      ELSE 0 END AS open_leads,

      CASE WHEN ${showSales}::boolean THEN
        (SELECT count(*)::int
         FROM quotations
         WHERE status IN ('draft','sent'))
      ELSE 0 END AS pending_quotations,

      CASE WHEN ${showField}::boolean THEN
        (SELECT count(*)::int
         FROM orders o
         WHERE o.status NOT IN ('closed','cancelled','completed')
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
           ))
      ELSE 0 END AS active_orders,

      CASE WHEN ${showField}::boolean THEN
        (SELECT count(*)::int
         FROM order_locations ol
         JOIN orders o ON o.id = ol.order_id
         WHERE ol.status = 'completed'
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
                   AND (owa.order_location_id IS NULL OR owa.order_location_id = ol.id)
               )
             )
           ))
      ELSE 0 END AS completed_locations,

      CASE WHEN ${showField}::boolean THEN
        (SELECT count(*)::int
         FROM order_locations ol
         JOIN orders o ON o.id = ol.order_id
         WHERE ol.status <> 'cancelled'
           AND o.status <> 'cancelled'
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
                   AND (owa.order_location_id IS NULL OR owa.order_location_id = ol.id)
               )
             )
           ))
      ELSE 0 END AS total_locations,

      CASE WHEN ${showOperationsValue}::boolean THEN
        (SELECT COALESCE(sum(total_order_amount),0)
         FROM orders
         WHERE created_at >= date_trunc('month', now())
           AND created_at < date_trunc('month', now()) + interval '1 month'
           AND status <> 'cancelled')
      ELSE 0 END AS month_order_value,

      CASE WHEN ${showFinance}::boolean THEN
        (SELECT COALESCE(sum(total_amount - amount_paid),0)
         FROM invoices
         WHERE status <> 'cancelled')
      ELSE 0 END AS customer_outstanding,

      CASE WHEN ${showFinance}::boolean THEN
        (SELECT COALESCE(sum(amount),0)
         FROM expenses
         WHERE expense_date >= date_trunc('month', CURRENT_DATE)::date
           AND expense_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)
      ELSE 0 END AS month_expenses,

      CASE WHEN ${showFinance}::boolean THEN
        (SELECT COALESCE(sum(amount),0)
         FROM worker_payments
         WHERE payment_date >= date_trunc('month', CURRENT_DATE)::date
           AND payment_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date)
      ELSE 0 END AS month_worker_payments,

      CASE WHEN ${showSales}::boolean THEN
        (SELECT count(*)::int
         FROM leads
         WHERE next_follow_up_at < now()
           AND status NOT IN ('won','lost'))
      ELSE 0 END AS overdue_followups,

      CASE WHEN ${showField}::boolean THEN
        (SELECT count(*)::int
         FROM order_locations ol
         JOIN orders o ON o.id = ol.order_id
         WHERE ol.status = 'blocked'
           AND o.status <> 'cancelled'
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
                   AND (owa.order_location_id IS NULL OR owa.order_location_id = ol.id)
               )
             )
           ))
      ELSE 0 END AS blocked_locations,

      CASE WHEN ${showFinance}::boolean THEN
        (SELECT count(*)::int
         FROM invoices
         WHERE due_date < CURRENT_DATE
           AND status NOT IN ('paid','cancelled'))
      ELSE 0 END AS overdue_invoices
  `;

  return rows[0];
}

export async function getRecentOrdersForUser(
  user: Pick<CurrentAppUser, "id" | "role" | "worker_id">
) {
  if (!["super_admin", "operations_manager", "supervisor"].includes(user.role)) {
    return [];
  }

  const isSupervisor = user.role === "supervisor";

  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.status,
      o.due_date,
      o.total_order_amount,
      c.company_name,
      COALESCE(loc.progress, 0)::int AS progress
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN (
      SELECT
        order_id,
        ROUND(COALESCE(AVG(progress_percent), 0))::int AS progress
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
    ORDER BY o.created_at DESC
    LIMIT 8
  `;
}

export async function getLeads() {
  return sql`
    SELECT l.id, l.lead_no, l.company_name, l.contact_person, l.phone, l.source, l.status,
           l.next_follow_up_at, l.created_at, u.full_name AS assigned_to_name
    FROM leads l
    LEFT JOIN app_users u ON u.id=l.assigned_to
    ORDER BY l.created_at DESC
    LIMIT 150
  `;
}

export async function getCustomers() {
  return sql`
    SELECT c.id, c.customer_code, c.company_name, c.contact_person, c.phone, c.city, c.state,
           COALESCE((SELECT sum(o.total_order_amount) FROM orders o WHERE o.customer_id=c.id),0) AS total_business,
           COALESCE((SELECT sum(i.total_amount-i.amount_paid) FROM invoices i WHERE i.customer_id=c.id AND i.status<>'cancelled'),0) AS outstanding
    FROM customers c
    WHERE c.is_active=true
    ORDER BY c.company_name
    LIMIT 200
  `;
}

export async function getQuotations() {
  return sql`
    SELECT q.id, q.quotation_no, q.quotation_date, q.valid_until, q.status, q.grand_total,
           c.company_name
    FROM quotations q
    LEFT JOIN customers c ON c.id=q.customer_id
    ORDER BY q.created_at DESC
    LIMIT 150
  `;
}

export async function getOrders() {
  return sql`
    SELECT o.id, o.order_no, o.campaign_name, o.status, o.start_date, o.due_date, o.total_order_amount,
           c.company_name,
           COALESCE((SELECT avg(ol.progress_percent) FROM order_locations ol WHERE ol.order_id=o.id),0)::int AS progress
    FROM orders o
    JOIN customers c ON c.id=o.customer_id
    ORDER BY o.created_at DESC
    LIMIT 150
  `;
}

export async function getWorkLocations() {
  return sql`
    SELECT ol.id, ol.location_name, ol.city, ol.district, ol.state, ol.status, ol.progress_percent,
           ol.planned_date, ol.completed_date, o.order_no, o.campaign_name, c.company_name
    FROM order_locations ol
    JOIN orders o ON o.id=ol.order_id
    JOIN customers c ON c.id=o.customer_id
    ORDER BY ol.updated_at DESC
    LIMIT 200
  `;
}

export async function getWorkers() {
  return sql`
    SELECT w.id, w.worker_code, w.name, w.phone, w.skill, w.state, w.payment_mode, w.default_rate,
           COALESCE((SELECT sum(wp.amount) FROM worker_payments wp WHERE wp.worker_id=w.id),0) AS paid_total
    FROM workers w
    WHERE w.is_active=true
    ORDER BY w.name
    LIMIT 200
  `;
}

export async function getFinanceSummary() {
  const rows = await sql`
    SELECT
      (SELECT COALESCE(sum(total_order_amount),0) FROM orders) AS order_value,
      (SELECT COALESCE(sum(amount),0) FROM customer_payments) AS collected,
      (SELECT COALESCE(sum(total_amount-amount_paid),0) FROM invoices WHERE status<>'cancelled') AS receivables,
      (SELECT COALESCE(sum(amount),0) FROM expenses) AS expenses,
      (SELECT COALESCE(sum(amount),0) FROM worker_payments) AS worker_payments
  `;
  return rows[0];
}
