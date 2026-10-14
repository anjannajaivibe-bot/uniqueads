import { sql } from "@/lib/db";

export async function getCustomerList() {
  return sql`
    SELECT
      c.id,
      c.customer_code,
      c.company_name,
      c.contact_person,
      c.phone,
      c.whatsapp,
      c.email,
      c.gstin,
      c.city,
      c.state,
      c.is_active,
      c.created_at,
      COALESCE(o.order_count, 0)::int AS order_count,
      COALESCE(o.order_value, 0) AS order_value,
      COALESCE(i.invoice_total, 0) AS invoice_total,
      COALESCE(p.received_total, 0) AS received_total
    FROM customers c
    LEFT JOIN (
      SELECT
        customer_id,
        count(*) FILTER (WHERE status <> 'cancelled') AS order_count,
        COALESCE(sum(total_order_amount) FILTER (WHERE status <> 'cancelled'), 0) AS order_value
      FROM orders
      GROUP BY customer_id
    ) o ON o.customer_id = c.id
    LEFT JOIN (
      SELECT
        customer_id,
        COALESCE(sum(total_amount) FILTER (WHERE status <> 'cancelled'), 0) AS invoice_total
      FROM invoices
      GROUP BY customer_id
    ) i ON i.customer_id = c.id
    LEFT JOIN (
      SELECT
        customer_id,
        COALESCE(sum(amount), 0) AS received_total
      FROM customer_payments
      GROUP BY customer_id
    ) p ON p.customer_id = c.id
    ORDER BY
      CASE WHEN c.is_active THEN 0 ELSE 1 END,
      c.company_name
    LIMIT 1000
  `;
}

export async function getCustomerCounts() {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE is_active = true)::int AS active_count,
      count(*) FILTER (WHERE gstin IS NOT NULL AND btrim(gstin) <> '')::int AS gst_count,
      count(*)::int AS total_count
    FROM customers
  `;

  const financial = await sql`
    SELECT
      COALESCE((SELECT sum(total_amount) FROM invoices WHERE status <> 'cancelled'), 0) AS invoice_total,
      COALESCE((SELECT sum(amount) FROM customer_payments), 0) AS received_total
  `;

  return {
    ...(rows[0] as any),
    ...(financial[0] as any),
  };
}

export async function getCustomerById(id: string) {
  const rows = await sql`
    SELECT
      c.*,
      creator.full_name AS created_by_name
    FROM customers c
    LEFT JOIN app_users creator ON creator.id = c.created_by
    WHERE c.id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getCustomerOrders(customerId: string) {
  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.status,
      o.start_date,
      o.due_date,
      o.total_order_amount,
      o.advance_received,
      q.quotation_no
    FROM orders o
    LEFT JOIN quotations q ON q.id = o.quotation_id
    WHERE o.customer_id = ${customerId}::uuid
    ORDER BY o.created_at DESC
    LIMIT 250
  `;
}

export async function getCustomerQuotations(customerId: string) {
  return sql`
    SELECT
      q.id,
      q.quotation_no,
      q.quotation_date,
      q.valid_until,
      q.status,
      q.grand_total
    FROM quotations q
    WHERE q.customer_id = ${customerId}::uuid
    ORDER BY q.created_at DESC
    LIMIT 250
  `;
}

export async function getCustomerInvoices(customerId: string) {
  return sql`
    SELECT
      i.id,
      i.invoice_no,
      i.invoice_date,
      i.due_date,
      i.status,
      i.total_amount,
      i.amount_paid,
      o.order_no
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    WHERE i.customer_id = ${customerId}::uuid
    ORDER BY i.invoice_date DESC, i.created_at DESC
    LIMIT 250
  `;
}

export async function getCustomerPayments(customerId: string) {
  return sql`
    SELECT
      cp.id,
      cp.payment_no,
      cp.payment_date,
      cp.amount,
      cp.payment_method,
      cp.reference_no,
      cp.notes,
      o.order_no,
      i.invoice_no,
      u.full_name AS received_by_name
    FROM customer_payments cp
    LEFT JOIN orders o ON o.id = cp.order_id
    LEFT JOIN invoices i ON i.id = cp.invoice_id
    LEFT JOIN app_users u ON u.id = cp.received_by
    WHERE cp.customer_id = ${customerId}::uuid
    ORDER BY cp.payment_date DESC, cp.created_at DESC
    LIMIT 250
  `;
}

export async function getCustomerLeads(customerId: string) {
  return sql`
    SELECT
      l.id,
      l.lead_no,
      l.status,
      l.advertising_type,
      l.location,
      l.created_at
    FROM leads l
    WHERE l.customer_id = ${customerId}::uuid
    ORDER BY l.created_at DESC
    LIMIT 100
  `;
}

export async function getCustomerActivity(customerId: string) {
  return sql`
    SELECT
      a.id,
      a.action,
      a.description,
      a.created_at,
      u.full_name AS actor_name
    FROM activity_logs a
    LEFT JOIN app_users u ON u.id = a.actor_user_id
    WHERE a.entity_type = 'customer'
      AND a.entity_id = ${customerId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 200
  `;
}
