import { NextRequest, NextResponse } from "next/server";
import {
  APP_SESSION_COOKIE,
  verifyPasswordSessionToken,
} from "@/lib/auth/password-session";

const PUBLIC_PATHS = [
  "/login",
  "/api/app-auth/login",
  "/api/app-auth/logout",
];

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  ) {
    return NextResponse.next();
  }

  // Neon Auth UI is no longer the application login surface.
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth")
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "This authentication route is disabled." },
        { status: 404 }
      );
    }

    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const token = request.cookies.get(APP_SESSION_COOKIE)?.value;
  const session = await verifyPasswordSessionToken(token);

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 }
    );
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set(
    "next",
    `${pathname}${request.nextUrl.search}`
  );

  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|unique-ads-logo.png).*)",
  ],
};
