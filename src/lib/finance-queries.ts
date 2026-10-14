import { sql } from "@/lib/db";

export async function getFinanceSummary() {
  const rows = await sql`
    SELECT
      COALESCE((
        SELECT sum(total_amount)
        FROM invoices
        WHERE status <> 'cancelled'
      ), 0) AS invoice_total,

      COALESCE((
        SELECT sum(amount_paid)
        FROM invoices
        WHERE status <> 'cancelled'
      ), 0) AS invoice_paid,

      COALESCE((
        SELECT sum(amount)
        FROM customer_payments
        WHERE date_trunc('month', payment_date::timestamp)
          = date_trunc('month', CURRENT_DATE::timestamp)
      ), 0) AS collections_month,

      COALESCE((
        SELECT sum(amount)
        FROM expenses
        WHERE date_trunc('month', expense_date::timestamp)
          = date_trunc('month', CURRENT_DATE::timestamp)
      ), 0) AS expenses_month,

      COALESCE((
        SELECT sum(amount)
        FROM worker_payments
        WHERE date_trunc('month', payment_date::timestamp)
          = date_trunc('month', CURRENT_DATE::timestamp)
      ), 0) AS worker_payments_month,

      COALESCE((
        SELECT sum(total_order_amount)
        FROM orders
        WHERE status <> 'cancelled'
      ), 0) AS total_order_value,

      COALESCE((
        SELECT sum(amount)
        FROM expenses
      ), 0) AS total_expenses,

      COALESCE((
        SELECT sum(amount)
        FROM worker_payments
      ), 0) AS total_worker_payments
  `;

  return rows[0];
}

export async function getInvoiceList() {
  return sql`
    SELECT
      i.id,
      i.invoice_no,
      i.invoice_date,
      i.due_date,
      i.status,
      i.total_amount,
      i.amount_paid,
      o.order_no,
      o.campaign_name,
      c.company_name,
      c.phone
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    ORDER BY
      CASE
        WHEN i.due_date IS NOT NULL
          AND i.due_date < CURRENT_DATE
          AND i.status NOT IN ('paid', 'cancelled') THEN 0
        ELSE 1
      END,
      i.due_date NULLS LAST,
      i.invoice_date DESC,
      i.created_at DESC
    LIMIT 500
  `;
}

export async function getExpenseList() {
  return sql`
    SELECT
      e.id,
      e.expense_no,
      e.expense_date,
      e.category,
      e.vendor_name,
      e.description,
      e.amount,
      e.payment_method,
      e.bill_url,
      o.order_no,
      o.campaign_name,
      u.full_name AS entered_by_name
    FROM expenses e
    LEFT JOIN orders o ON o.id = e.order_id
    LEFT JOIN app_users u ON u.id = e.entered_by
    ORDER BY e.expense_date DESC, e.created_at DESC
    LIMIT 500
  `;
}

export async function getFinanceOrderOptions() {
  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.customer_id,
      o.quotation_id,
      o.total_order_amount,
      o.advance_received,
      o.status,
      c.company_name,
      count(i.id)::int AS invoice_count
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN invoices i
      ON i.order_id = o.id
      AND i.status <> 'cancelled'
    WHERE o.status <> 'cancelled'
    GROUP BY
      o.id,
      o.order_no,
      o.campaign_name,
      o.customer_id,
      o.quotation_id,
      o.total_order_amount,
      o.advance_received,
      o.status,
      c.company_name
    ORDER BY o.created_at DESC
    LIMIT 500
  `;
}

export async function getOrderProfitability() {
  return sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.status,
      o.total_order_amount,
      o.advance_received,
      c.company_name,
      COALESCE(cp.collected, 0) AS collected,
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
      SELECT COALESCE(sum(amount), 0) AS collected
      FROM customer_payments
      WHERE order_id = o.id
    ) cp ON true
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
    WHERE o.status <> 'cancelled'
    ORDER BY o.created_at DESC
    LIMIT 250
  `;
}

export async function getInvoiceOrderSource(orderId: string) {
  const rows = await sql`
    SELECT
      o.id,
      o.order_no,
      o.campaign_name,
      o.customer_id,
      o.quotation_id,
      o.total_order_amount,
      o.advance_received,
      c.company_name,
      c.contact_person,
      c.phone,
      c.email,
      c.gstin,
      c.billing_address,
      c.city,
      c.state,
      c.pincode,
      q.quotation_no,
      q.subtotal AS quotation_subtotal,
      q.discount_amount AS quotation_discount,
      q.taxable_amount AS quotation_taxable,
      q.cgst_amount AS quotation_cgst,
      q.sgst_amount AS quotation_sgst,
      q.igst_amount AS quotation_igst,
      q.grand_total AS quotation_total,
      q.payment_terms AS quotation_payment_terms
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN quotations q ON q.id = o.quotation_id
    WHERE o.id = ${orderId}::uuid
      AND o.status <> 'cancelled'
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getInvoiceSourceItems(quotationId: string | null) {
  if (!quotationId) return [];

  return sql`
    SELECT
      description,
      quantity,
      unit,
      rate,
      amount
    FROM quotation_items
    WHERE quotation_id = ${quotationId}::uuid
    ORDER BY sort_order, created_at
  `;
}

export async function getInvoiceById(id: string) {
  const rows = await sql`
    SELECT
      i.*,
      o.order_no,
      o.campaign_name,
      o.status AS order_status,
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
      creator.full_name AS created_by_name
    FROM invoices i
    JOIN orders o ON o.id = i.order_id
    JOIN customers c ON c.id = i.customer_id
    LEFT JOIN app_users creator ON creator.id = i.created_by
    WHERE i.id = ${id}::uuid
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getInvoiceItems(invoiceId: string) {
  return sql`
    SELECT
      id,
      sort_order,
      description,
      quantity,
      unit,
      rate,
      amount
    FROM invoice_items
    WHERE invoice_id = ${invoiceId}::uuid
    ORDER BY sort_order, created_at
  `;
}

export async function getInvoicePayments(invoiceId: string) {
  return sql`
    SELECT
      cp.id,
      cp.payment_no,
      cp.payment_date,
      cp.amount,
      cp.payment_method,
      cp.reference_no,
      cp.notes,
      u.full_name AS received_by_name
    FROM customer_payments cp
    LEFT JOIN app_users u ON u.id = cp.received_by
    WHERE cp.invoice_id = ${invoiceId}::uuid
    ORDER BY cp.payment_date DESC, cp.created_at DESC
  `;
}

export async function getInvoiceActivity(invoiceId: string) {
  return sql`
    SELECT
      a.id,
      a.action,
      a.description,
      a.created_at,
      u.full_name AS actor_name
    FROM activity_logs a
    LEFT JOIN app_users u ON u.id = a.actor_user_id
    WHERE a.entity_type = 'invoice'
      AND a.entity_id = ${invoiceId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 200
  `;
}

export async function getFinanceCompanySettings() {
  const rows = await sql`
    SELECT *
    FROM company_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
