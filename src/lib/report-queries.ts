import { sql } from "@/lib/db";

export type ReportRange = {
  from: string;
  to: string;
};

export async function getExecutiveReport(range: ReportRange) {
  const rows = await sql`
    SELECT
      (SELECT count(*) FROM leads
        WHERE created_at::date BETWEEN ${range.from}::date AND ${range.to}::date
      )::int AS leads_created,

      (SELECT count(*) FROM leads
        WHERE status = 'won'
          AND updated_at::date BETWEEN ${range.from}::date AND ${range.to}::date
      )::int AS leads_won,

      COALESCE((
        SELECT sum(grand_total)
        FROM quotations
        WHERE quotation_date BETWEEN ${range.from}::date AND ${range.to}::date
          AND status <> 'rejected'
      ), 0) AS quotation_value,

      COALESCE((
        SELECT sum(total_order_amount)
        FROM orders
        WHERE created_at::date BETWEEN ${range.from}::date AND ${range.to}::date
          AND status <> 'cancelled'
      ), 0) AS order_value,

      COALESCE((
        SELECT sum(total_amount)
        FROM invoices
        WHERE invoice_date BETWEEN ${range.from}::date AND ${range.to}::date
          AND status <> 'cancelled'
      ), 0) AS invoiced_value,

      COALESCE((
        SELECT sum(amount)
        FROM customer_payments
        WHERE payment_date BETWEEN ${range.from}::date AND ${range.to}::date
      ), 0) AS collected_value,

      COALESCE((
        SELECT sum(amount)
        FROM expenses
        WHERE expense_date BETWEEN ${range.from}::date AND ${range.to}::date
      ), 0) AS expense_value,

      COALESCE((
        SELECT sum(amount)
        FROM worker_payments
        WHERE payment_date BETWEEN ${range.from}::date AND ${range.to}::date
      ), 0) AS worker_payment_value,

      (SELECT count(*) FROM orders
        WHERE status NOT IN ('completed', 'invoiced', 'closed', 'cancelled')
      )::int AS active_orders,

      (SELECT count(*) FROM invoices
        WHERE due_date < CURRENT_DATE
          AND status NOT IN ('paid', 'cancelled')
      )::int AS overdue_invoices,

      ROUND(COALESCE((
        SELECT avg(progress_percent)
        FROM order_locations
        WHERE status <> 'cancelled'
      ), 0))::int AS location_completion
  `;

  return rows[0];
}

export async function getSalesFunnel(range: ReportRange) {
  return sql`
    SELECT
      status,
      count(*)::int AS count
    FROM leads
    WHERE created_at::date BETWEEN ${range.from}::date AND ${range.to}::date
    GROUP BY status
    ORDER BY CASE status
      WHEN 'new' THEN 1
      WHEN 'contacted' THEN 2
      WHEN 'requirement_received' THEN 3
      WHEN 'quotation_sent' THEN 4
      WHEN 'negotiation' THEN 5
      WHEN 'won' THEN 6
      WHEN 'lost' THEN 7
      ELSE 8
    END
  `;
}

export async function getMonthlyPerformance() {
  return sql`
    WITH months AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE) - interval '5 months',
        date_trunc('month', CURRENT_DATE),
        interval '1 month'
      ) AS month_start
    )
    SELECT
      to_char(m.month_start, 'Mon YYYY') AS month_label,
      m.month_start,
      COALESCE((
        SELECT sum(o.total_order_amount)
        FROM orders o
        WHERE date_trunc('month', o.created_at) = m.month_start
          AND o.status <> 'cancelled'
      ), 0) AS order_value,
      COALESCE((
        SELECT sum(i.total_amount)
        FROM invoices i
        WHERE date_trunc('month', i.invoice_date::timestamp) = m.month_start
          AND i.status <> 'cancelled'
      ), 0) AS invoice_value,
      COALESCE((
        SELECT sum(cp.amount)
        FROM customer_payments cp
        WHERE date_trunc('month', cp.payment_date::timestamp) = m.month_start
      ), 0) AS collections,
      COALESCE((
        SELECT sum(e.amount)
        FROM expenses e
        WHERE date_trunc('month', e.expense_date::timestamp) = m.month_start
      ), 0) AS expenses,
      COALESCE((
        SELECT sum(wp.amount)
        FROM worker_payments wp
        WHERE date_trunc('month', wp.payment_date::timestamp) = m.month_start
      ), 0) AS worker_payments
    FROM months m
    ORDER BY m.month_start
  `;
}

export async function getExpenseBreakdown(range: ReportRange) {
  return sql`
    SELECT
      category,
      count(*)::int AS entries,
      COALESCE(sum(amount), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ${range.from}::date AND ${range.to}::date
    GROUP BY category
    ORDER BY total DESC
  `;
}

export async function getCustomerOutstandingReport() {
  return sql`
    SELECT
      c.id,
      c.customer_code,
      c.company_name,
      c.phone,
      COALESCE(i.total_invoiced, 0) AS total_invoiced,
      COALESCE(p.total_received, 0) AS total_received,
      GREATEST(
        0,
        COALESCE(i.total_invoiced, 0) - COALESCE(p.total_received, 0)
      ) AS outstanding
    FROM customers c
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(total_amount), 0) AS total_invoiced
      FROM invoices
      WHERE customer_id = c.id
        AND status <> 'cancelled'
    ) i ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(amount), 0) AS total_received
      FROM customer_payments
      WHERE customer_id = c.id
    ) p ON true
    WHERE c.is_active = true
      AND GREATEST(
        0,
        COALESCE(i.total_invoiced, 0) - COALESCE(p.total_received, 0)
      ) > 0
    ORDER BY outstanding DESC
    LIMIT 100
  `;
}

export async function getOrderProfitabilityReport(range: ReportRange) {
  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.status,
      o.created_at,
      o.total_order_amount,
      c.company_name,
      COALESCE(ex.expenses, 0) AS expenses,
      COALESCE(wp.worker_cost, 0) AS worker_cost,
      (
        o.total_order_amount
        - COALESCE(ex.expenses, 0)
        - COALESCE(wp.worker_cost, 0)
      ) AS estimated_profit
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(amount), 0) AS expenses
      FROM expenses
      WHERE order_id = o.id
    ) ex ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(sum(amount), 0) AS worker_cost
      FROM worker_payments
      WHERE order_id = o.id
    ) wp ON true
    WHERE o.created_at::date BETWEEN ${range.from}::date AND ${range.to}::date
      AND o.status <> 'cancelled'
    ORDER BY estimated_profit DESC
    LIMIT 100
  `;
}

export async function getStatePerformance(range: ReportRange) {
  return sql`
    SELECT
      COALESCE(c.state, 'Not set') AS state,
      count(DISTINCT o.id)::int AS order_count,
      COALESCE(sum(o.total_order_amount), 0) AS order_value
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.created_at::date BETWEEN ${range.from}::date AND ${range.to}::date
      AND o.status <> 'cancelled'
    GROUP BY COALESCE(c.state, 'Not set')
    ORDER BY order_value DESC
  `;
}

export async function getWorkerPaymentReport(range: ReportRange) {
  return sql`
    SELECT
      w.id,
      w.worker_code,
      w.name,
      w.skill,
      count(wp.id)::int AS payment_entries,
      COALESCE(sum(wp.amount), 0) AS paid_total
    FROM workers w
    LEFT JOIN worker_payments wp
      ON wp.worker_id = w.id
      AND wp.payment_date BETWEEN ${range.from}::date AND ${range.to}::date
    WHERE w.is_active = true
    GROUP BY w.id, w.worker_code, w.name, w.skill
    HAVING COALESCE(sum(wp.amount), 0) > 0
    ORDER BY paid_total DESC
    LIMIT 100
  `;
}

export async function getOverdueInvoicesReport() {
  return sql`
    SELECT
      i.id,
      i.invoice_no,
      i.due_date,
      i.total_amount,
      i.amount_paid,
      c.company_name,
      c.phone,
      o.order_no
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    JOIN orders o ON o.id = i.order_id
    WHERE i.due_date < CURRENT_DATE
      AND i.status NOT IN ('paid', 'cancelled')
    ORDER BY i.due_date ASC
    LIMIT 100
  `;
}
