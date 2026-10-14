import { sql } from "@/lib/db";

export async function getLeadList() {
  return sql`
    SELECT
      l.id,
      l.lead_no,
      l.company_name,
      l.contact_person,
      l.phone,
      l.whatsapp,
      l.email,
      l.location,
      l.advertising_type,
      l.number_of_locations,
      l.estimated_wall_area_sqft,
      l.source,
      l.status,
      l.next_follow_up_at,
      l.created_at,
      l.updated_at,
      u.full_name AS assigned_to_name
    FROM leads l
    LEFT JOIN app_users u ON u.id = l.assigned_to
    ORDER BY
      CASE
        WHEN l.next_follow_up_at IS NOT NULL
         AND l.next_follow_up_at < now()
         AND l.status NOT IN ('won', 'lost') THEN 0
        ELSE 1
      END,
      l.next_follow_up_at NULLS LAST,
      l.created_at DESC
    LIMIT 500
  `;
}

export async function getLeadById(id: string) {
  const rows = await sql`
    SELECT
      l.*,
      assigned.full_name AS assigned_to_name,
      creator.full_name AS created_by_name,
      c.customer_code,
      c.company_name AS customer_company_name
    FROM leads l
    LEFT JOIN app_users assigned ON assigned.id = l.assigned_to
    LEFT JOIN app_users creator ON creator.id = l.created_by
    LEFT JOIN customers c ON c.id = l.customer_id
    WHERE l.id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getLeadFollowups(leadId: string) {
  return sql`
    SELECT
      f.id,
      f.follow_up_at,
      f.next_follow_up_at,
      f.channel,
      f.outcome,
      f.notes,
      f.created_at,
      u.full_name AS created_by_name
    FROM lead_followups f
    LEFT JOIN app_users u ON u.id = f.created_by
    WHERE f.lead_id = ${leadId}
    ORDER BY f.follow_up_at DESC, f.created_at DESC
    LIMIT 200
  `;
}

export async function getLeadActivity(leadId: string) {
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
    WHERE a.entity_type = 'lead'
      AND a.entity_id = ${leadId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 200
  `;
}

export async function getAssignableUsers() {
  return sql`
    SELECT id, full_name, email, role
    FROM app_users
    WHERE is_active = true
    ORDER BY
      CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'operations_manager' THEN 2
        WHEN 'sales' THEN 3
        WHEN 'supervisor' THEN 4
        WHEN 'accounts' THEN 5
        ELSE 6
      END,
      full_name
  `;
}

export async function getLeadPipelineCounts() {
  const rows = await sql`
    SELECT
      count(*) FILTER (WHERE status = 'new')::int AS new_count,
      count(*) FILTER (WHERE status = 'contacted')::int AS contacted_count,
      count(*) FILTER (WHERE status = 'requirement_received')::int AS requirement_count,
      count(*) FILTER (WHERE status = 'quotation_sent')::int AS quotation_count,
      count(*) FILTER (WHERE status = 'negotiation')::int AS negotiation_count,
      count(*) FILTER (WHERE status = 'won')::int AS won_count,
      count(*) FILTER (WHERE status = 'lost')::int AS lost_count,
      count(*) FILTER (
        WHERE next_follow_up_at IS NOT NULL
          AND next_follow_up_at < now()
          AND status NOT IN ('won', 'lost')
      )::int AS overdue_count
    FROM leads
  `;
  return rows[0];
}
