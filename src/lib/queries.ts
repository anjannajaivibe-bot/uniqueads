import { sql } from "@/lib/db";

export async function getDashboardMetrics() {
  const rows = await sql`
    SELECT
      (SELECT count(*)::int FROM leads WHERE status IN ('new','contacted','requirement_received','quotation_sent','negotiation')) AS open_leads,
      (SELECT count(*)::int FROM quotations WHERE status IN ('draft','sent')) AS pending_quotations,
      (SELECT count(*)::int FROM orders WHERE status NOT IN ('closed','cancelled','completed')) AS active_orders,
      (SELECT count(*)::int FROM order_locations WHERE status = 'completed') AS completed_locations,
      (SELECT count(*)::int FROM order_locations) AS total_locations,
      (SELECT COALESCE(sum(total_order_amount),0) FROM orders WHERE date_trunc('month', created_at) = date_trunc('month', now())) AS month_order_value,
      (SELECT COALESCE(sum(total_amount - amount_paid),0) FROM invoices WHERE status <> 'cancelled') AS customer_outstanding,
      (SELECT COALESCE(sum(amount),0) FROM expenses WHERE date_trunc('month', expense_date) = date_trunc('month', CURRENT_DATE)) AS month_expenses,
      (SELECT COALESCE(sum(amount),0) FROM worker_payments WHERE date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE)) AS month_worker_payments
  `;
  return rows[0];
}

export async function getRecentOrders() {
  return sql`
    SELECT o.id, o.order_no, o.campaign_name, o.status, o.due_date, o.total_order_amount,
           c.company_name,
           COALESCE((SELECT avg(ol.progress_percent) FROM order_locations ol WHERE ol.order_id=o.id),0)::int AS progress
    FROM orders o
    JOIN customers c ON c.id=o.customer_id
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
