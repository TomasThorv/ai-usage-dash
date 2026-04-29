import { randomBytes, timingSafeEqual } from "node:crypto";

export function issueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function validate(
  headerValue: string | null | undefined,
  cookieValue: string | null | undefined,
): boolean {
  if (!headerValue || !cookieValue) return false;
  const a = Buffer.from(headerValue);
  const b = Buffer.from(cookieValue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
