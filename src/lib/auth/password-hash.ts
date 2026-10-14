import {
  pbkdf2Sync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ITERATIONS = 210000;
const KEY_LENGTH = 32;

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    "sha256"
  );

  return [
    "pbkdf2_sha256",
    ITERATIONS,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export function verifyPassword(
  password: string,
  encoded: string | null | undefined
) {
  if (!encoded) return false;

  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2], "base64url");
  const expected = Buffer.from(parts[3], "base64url");

  if (
    !Number.isFinite(iterations) ||
    iterations < 100000 ||
    expected.length === 0
  ) {
    return false;
  }

  const actual = pbkdf2Sync(
    password,
    salt,
    iterations,
    expected.length,
    "sha256"
  );

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
