import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";

export const APP_SESSION_COOKIE = "uniqueads_app_session";

type SessionPayload = {
  userId: string;
  username: string;
  exp: number;
};

function secret() {
  return process.env.UNIQUEADS_APP_SESSION_SECRET || "";
}

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(normalized);
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );

  return new TextDecoder().decode(bytes);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return mismatch === 0;
}

async function sign(value: string) {
  const sessionSecret = secret();
  if (!sessionSecret) {
    throw new Error("UNIQUEADS_APP_SESSION_SECRET is not configured.");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createPasswordSessionToken(
  userId: string,
  username: string,
  hours = 12
) {
  const payload: SessionPayload = {
    userId,
    username,
    exp: Math.floor(Date.now() / 1000) + hours * 60 * 60,
  };

  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encoded);

  return `${encoded}.${signature}`;
}

export async function verifyPasswordSessionToken(
  token?: string | null
): Promise<SessionPayload | null> {
  if (!token || !secret()) return null;

  const [encoded, signature, ...extra] = token.split(".");
  if (!encoded || !signature || extra.length > 0) return null;

  const expected = await sign(encoded);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      decodeBase64Url(encoded)
    ) as SessionPayload;

    if (
      !payload.userId ||
      !payload.username ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getPasswordSessionAppUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(APP_SESSION_COOKIE)?.value;
  const payload = await verifyPasswordSessionToken(token);

  if (!payload) return null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    select *
    from public.app_users
    where id = ${payload.userId}
      and lower(username) = lower(${payload.username})
      and is_active = true
    limit 1
  `;

  return rows[0] || null;
}
