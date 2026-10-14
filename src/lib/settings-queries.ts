import { sql } from "@/lib/db";

export async function getCompanySettingsRecord() {
  const rows = await sql`
    SELECT *
    FROM company_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getAppUsers() {
  return sql`
    SELECT
      id,
      username,
      full_name,
      email,
      phone,
      role,
      is_active,
      worker_id,
      last_login_at,
      created_at,
      updated_at
    FROM app_users
    ORDER BY
      CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'operations_manager' THEN 2
        WHEN 'accounts' THEN 3
        WHEN 'supervisor' THEN 4
        WHEN 'sales' THEN 5
        ELSE 6
      END,
      full_name
  `;
}
