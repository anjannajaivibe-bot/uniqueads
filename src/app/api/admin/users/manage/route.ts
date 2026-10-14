import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { hashPassword } from "@/lib/auth/password-hash";
import { getPasswordSessionAppUser } from "@/lib/auth/password-session";

export const runtime = "nodejs";

const ROLES = new Set([
  "super_admin",
  "accounts",
  "operations_manager",
  "supervisor",
  "sales",
]);

function redirectToUsers(
  request: NextRequest,
  key: "success" | "error",
  value: string
) {
  const url = new URL("/admin/settings/users", request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const currentUser = await getPasswordSessionAppUser();

  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json(
      { error: "Super Admin access required." },
      { status: 403 }
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const sql = neon(databaseUrl);
  const form = await request.formData();
  const action = String(form.get("action") || "");

  try {
    if (action === "create") {
      const fullName = String(form.get("full_name") || "").trim();
      const username = String(form.get("username") || "")
        .trim()
        .toLowerCase();
      const password = String(form.get("password") || "");
      const role = String(form.get("role") || "");
      const teamName = String(form.get("team_name") || "").trim() || null;
      const phone = String(form.get("phone") || "").trim() || null;
      const email = String(form.get("email") || "").trim() || null;
      const workerId = String(form.get("worker_id") || "").trim() || null;

      if (!fullName) {
        return redirectToUsers(request, "error", "Full name is required.");
      }

      if (!/^[a-z0-9._-]{3,40}$/i.test(username)) {
        return redirectToUsers(
          request,
          "error",
          "Username must be 3-40 letters, numbers, dots, dashes or underscores."
        );
      }

      if (password.length < 8) {
        return redirectToUsers(
          request,
          "error",
          "Password must be at least 8 characters."
        );
      }

      if (!ROLES.has(role)) {
        return redirectToUsers(request, "error", "Invalid role.");
      }

      const passwordHash = hashPassword(password);

      await sql`
        insert into public.app_users
          (
            full_name,
            username,
            password_hash,
            email,
            phone,
            role,
            team_name,
            worker_id,
            is_active,
            password_changed_at
          )
        values
          (
            ${fullName},
            ${username},
            ${passwordHash},
            ${email},
            ${phone},
            ${role},
            ${teamName},
            ${workerId},
            true,
            now()
          )
      `;

      return redirectToUsers(request, "success", "User created.");
    }

    const userId = String(form.get("user_id") || "");
    if (!userId) {
      return redirectToUsers(request, "error", "User ID is missing.");
    }

    if (action === "reset_password") {
      const password = String(form.get("password") || "");
      if (password.length < 8) {
        return redirectToUsers(
          request,
          "error",
          "Password must be at least 8 characters."
        );
      }

      const passwordHash = hashPassword(password);
      await sql`
        update public.app_users
        set password_hash = ${passwordHash},
            password_changed_at = now(),
            failed_login_attempts = 0,
            locked_until = null,
            updated_at = now()
        where id = ${userId}
      `;

      return redirectToUsers(
        request,
        "success",
        "Password reset successfully."
      );
    }

    if (action === "toggle_active") {
      if (userId === currentUser.id) {
        return redirectToUsers(
          request,
          "error",
          "You cannot disable your own Super Admin login."
        );
      }

      await sql`
        update public.app_users
        set is_active = not is_active,
            updated_at = now()
        where id = ${userId}
      `;

      return redirectToUsers(
        request,
        "success",
        "User access updated."
      );
    }

    return redirectToUsers(request, "error", "Unsupported action.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save user.";

    if (
      message.toLowerCase().includes("unique") ||
      message.toLowerCase().includes("duplicate")
    ) {
      return redirectToUsers(
        request,
        "error",
        "That username or email is already in use."
      );
    }

    console.error("User management error:", error);
    return redirectToUsers(request, "error", "Unable to save user.");
  }
}
