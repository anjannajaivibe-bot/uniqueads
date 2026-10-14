import { getPasswordSessionAppUser } from "@/lib/auth/password-session";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export type AppRole =
  | "super_admin"
  | "accounts"
  | "operations_manager"
  | "supervisor"
  | "sales";

export type CurrentAppUser = {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  role: AppRole;
  is_active: boolean;
};

function normalizeEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function mapAppUser(row: Record<string, unknown>): CurrentAppUser {
  return {
    id: String(row.id),
    auth_user_id: row.auth_user_id ? String(row.auth_user_id) : null,
    full_name: String(row.full_name),
    email: String(row.email),
    role: String(row.role) as AppRole,
    is_active: Boolean(row.is_active),
  };
}

export async function requireAppUser(): Promise<CurrentAppUser> {
  // Unique Ads password-session authentication.
  const passwordSessionUser = await getPasswordSessionAppUser();
  if (passwordSessionUser) {
    return passwordSessionUser as any;
  }

  const devBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.UNIQUEADS_DEV_BYPASS_AUTH === "true";

  if (devBypass) {
    const email =
      normalizeEmail(process.env.UNIQUEADS_SUPER_ADMIN_EMAIL) ||
      "local-dev@uniqueads.local";

    const rows = await sql`
      INSERT INTO app_users (
        full_name,
        email,
        role,
        is_active
      ) VALUES (
        'Local Admin',
        ${email},
        'super_admin',
        true
      )
      ON CONFLICT (email)
      DO UPDATE SET
        role = 'super_admin',
        is_active = true
      RETURNING id, auth_user_id, full_name, email, role, is_active
    `;

    return mapAppUser(rows[0] as Record<string, unknown>);
  }
  const { data } = await auth.getSession();
  const session = data?.session;
  const user = data?.user;

  if (!session || !user) {
    redirect("/auth/sign-in");
  }

  const authUserId = String(user.id);
  const email = normalizeEmail(user.email);

  if (!email) {
    redirect("/unauthorized");
  }

  // Strongest match: the Neon Auth user ID is already linked.
  const linkedRows = await sql`
    SELECT id, auth_user_id, full_name, email, role, is_active
    FROM app_users
    WHERE auth_user_id = ${authUserId}
    LIMIT 1
  `;

  if (linkedRows.length > 0) {
    const current = mapAppUser(linkedRows[0] as Record<string, unknown>);
    if (!current.is_active) redirect("/unauthorized");
    return current;
  }

  // One-time bootstrap for the first Super Admin.
  // The email itself stays server-side in .env.local.
  const bootstrapEmail = normalizeEmail(process.env.UNIQUEADS_SUPER_ADMIN_EMAIL);

  if (bootstrapEmail && email === bootstrapEmail) {
    const fullName = String(user.name || email.split("@")[0]).trim();

    const rows = await sql`
      INSERT INTO app_users (
        auth_user_id, full_name, email, role, is_active
      ) VALUES (
        ${authUserId}, ${fullName}, ${email}, 'super_admin', true
      )
      ON CONFLICT (email)
      DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        full_name = EXCLUDED.full_name,
        role = 'super_admin',
        is_active = true,
        updated_at = now()
      RETURNING id, auth_user_id, full_name, email, role, is_active
    `;

    const current = mapAppUser(rows[0] as Record<string, unknown>);

    await sql`
      INSERT INTO activity_logs (
        actor_user_id, action, entity_type, entity_id, description, metadata
      ) VALUES (
        ${current.id},
        'super_admin_bootstrap',
        'app_user',
        ${current.id},
        'Initial Super Admin account linked to Neon Auth.',
        ${JSON.stringify({ role: current.role })}
      )
    `;

    return current;
  }

  // Future staff can be pre-created in app_users by email.
  // We only link an email-based allowlist entry when Neon reports the
  // authenticated email as verified.
  if (Boolean(user.emailVerified)) {
    const provisionedRows = await sql`
      UPDATE app_users
      SET auth_user_id = ${authUserId}, updated_at = now()
      WHERE lower(email) = ${email}
        AND is_active = true
        AND auth_user_id IS NULL
      RETURNING id, auth_user_id, full_name, email, role, is_active
    `;

    if (provisionedRows.length > 0) {
      return mapAppUser(provisionedRows[0] as Record<string, unknown>);
    }
  }

  redirect("/unauthorized");
}

export async function requireRole(allowedRoles: AppRole[]) {
  const currentUser = await requireAppUser();

  if (!allowedRoles.includes(currentUser.role)) {
    redirect("/unauthorized");
  }

  return currentUser;
}



