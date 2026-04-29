"use client";

import { CSRF_COOKIE } from "@/lib/config/csrf";

export function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const c of cookies) {
    const [k, ...rest] = c.trim().split("=");
    if (k === CSRF_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}
