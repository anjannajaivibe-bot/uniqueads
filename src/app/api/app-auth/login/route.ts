import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { verifyPassword } from "@/lib/auth/password-hash";
import {
  APP_SESSION_COOKIE,
  createPasswordSessionToken,
} from "@/lib/auth/password-session";

export const runtime = "nodejs";

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value || "/admin");
  return next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/admin";
}

function loginRedirect(
  request: NextRequest,
  error: string,
  next: string
) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", error);
  url.searchParams.set("next", next);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 }
    );
  }

  const form = await request.formData();
  const username = String(form.get("username") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");
  const next = safeNext(form.get("next"));

  if (!username || !password) {
    return loginRedirect(request, "invalid", next);
  }

  const sql = neon(databaseUrl);
  const users = await sql`
    select *
    from public.app_users
    where lower(username) = lower(${username})
    limit 1
  `;

  const user = users[0];
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent");

  if (!user) {
    await sql`
      insert into public.app_login_audit
        (username, success, ip_address, user_agent, failure_reason)
      values
        (${username}, false, ${ipAddress}, ${userAgent}, 'unknown_username')
    `;
    return loginRedirect(request, "invalid", next);
  }

  if (!user.is_active) {
    await sql`
      insert into public.app_login_audit
        (app_user_id, username, success, ip_address, user_agent, failure_reason)
      values
        (${user.id}, ${username}, false, ${ipAddress}, ${userAgent}, 'inactive')
    `;
    return loginRedirect(request, "inactive", next);
  }

  if (
    user.locked_until &&
    new Date(user.locked_until).getTime() > Date.now()
  ) {
    await sql`
      insert into public.app_login_audit
        (app_user_id, username, success, ip_address, user_agent, failure_reason)
      values
        (${user.id}, ${username}, false, ${ipAddress}, ${userAgent}, 'locked')
    `;
    return loginRedirect(request, "locked", next);
  }

  const valid = verifyPassword(password, user.password_hash);

  if (!valid) {
    await sql`
      update public.app_users
      set failed_login_attempts = failed_login_attempts + 1,
          locked_until = case
            when failed_login_attempts + 1 >= 5
              then now() + interval '15 minutes'
            else locked_until
          end,
          updated_at = now()
      where id = ${user.id}
    `;

    await sql`
      insert into public.app_login_audit
        (app_user_id, username, success, ip_address, user_agent, failure_reason)
      values
        (${user.id}, ${username}, false, ${ipAddress}, ${userAgent}, 'bad_password')
    `;

    return loginRedirect(request, "invalid", next);
  }

  await sql`
    update public.app_users
    set failed_login_attempts = 0,
        locked_until = null,
        last_login_at = now(),
        updated_at = now()
    where id = ${user.id}
  `;

  await sql`
    insert into public.app_login_audit
      (app_user_id, username, success, ip_address, user_agent)
    values
      (${user.id}, ${username}, true, ${ipAddress}, ${userAgent})
  `;

  const token = await createPasswordSessionToken(
    user.id,
    user.username,
    12
  );

  const response = NextResponse.redirect(
    new URL(next, request.url),
    303
  );

  response.cookies.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });

  return response;
}
