import { NextRequest, NextResponse } from "next/server";
import { APP_SESSION_COOKIE } from "@/lib/auth/password-session";

function clearAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login", request.url),
    303
  );

  response.cookies.set(APP_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request);
}

export async function GET(request: NextRequest) {
  return clearAndRedirect(request);
}
