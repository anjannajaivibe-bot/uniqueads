import { sql } from "@/lib/db";

export async function getQuotationList() {
  return sql`
    SELECT
      q.id,
      q.quotation_no,
      q.quotation_date,
      q.valid_until,
      q.status,
      q.grand_total,
      q.created_at,
      c.company_name,
      l.lead_no,
      l.contact_person,
      COALESCE(c.phone, l.phone) AS phone
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    LEFT JOIN leads l ON l.id = q.lead_id
    ORDER BY q.created_at DESC
    LIMIT 500
  `;
}

export async function getQuotationCounts() {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
      count(*) FILTER (WHERE status = 'sent')::int AS sent_count,
      count(*) FILTER (WHERE status = 'accepted')::int AS accepted_count,
      count(*) FILTER (WHERE status = 'converted')::int AS converted_count,
      COALESCE(sum(grand_total) FILTER (
        WHERE date_trunc('month', quotation_date) = date_trunc('month', CURRENT_DATE)
      ), 0) AS month_value
    FROM quotations
  `;
  return rows[0];
}

export async function getQuotationById(id: string) {
  const rows = await sql`
    SELECT
      q.*,
      c.customer_code,
      c.company_name,
      c.contact_person AS customer_contact_person,
      c.phone AS customer_phone,
      c.whatsapp AS customer_whatsapp,
      c.email AS customer_email,
      c.gstin AS customer_gstin,
      c.billing_address,
      c.city,
      c.state,
      c.pincode,
      l.lead_no,
      l.company_name AS lead_company_name,
      l.contact_person AS lead_contact_person,
      l.phone AS lead_phone,
      l.whatsapp AS lead_whatsapp,
      l.email AS lead_email,
      l.location AS lead_location,
      l.advertising_type AS lead_advertising_type,
      creator.full_name AS created_by_name
    FROM quotations q
    LEFT JOIN customers c ON c.id = q.customer_id
    LEFT JOIN leads l ON l.id = q.lead_id
    LEFT JOIN app_users creator ON creator.id = q.created_by
    WHERE q.id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getQuotationItems(quotationId: string) {
  return sql`
    SELECT id, sort_order, description, quantity, unit, rate, amount
    FROM quotation_items
    WHERE quotation_id = ${quotationId}::uuid
    ORDER BY sort_order, created_at
  `;
}

export async function getQuotationActivity(quotationId: string) {
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
    WHERE a.entity_type = 'quotation'
      AND a.entity_id = ${quotationId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 200
  `;
}

export async function getQuotationCustomers() {
  return sql`
    SELECT id, customer_code, company_name, contact_person, phone, state
    FROM customers
    WHERE is_active = true
    ORDER BY company_name
    LIMIT 500
  `;
}

export async function getQuotationLeads() {
  return sql`
    SELECT
      id,
      lead_no,
      customer_id,
      company_name,
      contact_person,
      phone,
      location,
      advertising_type,
      status
    FROM leads
    WHERE status <> 'lost'
    ORDER BY created_at DESC
    LIMIT 500
  `;
}

export async function getCompanySettings() {
  const rows = await sql`
    SELECT *
    FROM company_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
