// Internal helpers shared by provider adapters. No credentials are ever logged
// or echoed in error messages — only HTTP status, method, and a sanitized URL.

const SECRET_QS_KEYS = new Set(["key", "api_key", "apikey", "access_token", "token", "auth"]);

function sanitizeUrl(input: string): string {
  try {
    const u = new URL(input);
    for (const k of Array.from(u.searchParams.keys())) {
      if (SECRET_QS_KEYS.has(k.toLowerCase())) u.searchParams.set(k, "***");
    }
    // Drop userinfo if present (e.g., basic auth in URL).
    u.username = "";
    u.password = "";
    return `${u.origin}${u.pathname}${u.search ? u.search : ""}`;
  } catch {
    return "<invalid-url>";
  }
}

export class ProviderHttpError extends Error {
  readonly status: number;
  readonly providerId: string;
  constructor(providerId: string, status: number, url: string, hint?: string) {
    const safeUrl = sanitizeUrl(url);
    const tail = hint ? ` (${hint})` : "";
    super(`[${providerId}] HTTP ${status} ${safeUrl}${tail}`);
    this.name = "ProviderHttpError";
    this.status = status;
    this.providerId = providerId;
  }
}

export interface JsonFetchOptions {
  providerId: string;
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  signal: AbortSignal;
}

export async function jsonFetch<T>(opts: JsonFetchOptions): Promise<T> {
  const { providerId, url, method = "GET", headers, body, signal } = opts;
  let res: Response;
  try {
    const init: RequestInit = { method, signal };
    if (headers) init.headers = headers;
    if (body !== undefined) init.body = body;
    res = await fetch(url, init);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`[${providerId}] request aborted`);
    }
    const reason = err instanceof Error ? err.name : "fetch_failed";
    throw new Error(`[${providerId}] network error (${reason})`);
  }
  if (!res.ok) {
    let hint: string | undefined;
    try {
      const text = await res.text();
      // Pull a short, generic error key from JSON if present, never include creds.
      const trimmed = text.slice(0, 256);
      if (trimmed) {
        const parsed = safeJson(trimmed);
        if (parsed && typeof parsed === "object" && "error" in parsed) {
          const e = (parsed as { error: unknown }).error;
          if (typeof e === "string") hint = e.slice(0, 120);
          else if (e && typeof e === "object" && "message" in e) {
            const m = (e as { message: unknown }).message;
            if (typeof m === "string") hint = m.slice(0, 120);
          }
        }
      }
    } catch {
      // ignore
    }
    throw new ProviderHttpError(providerId, res.status, url, hint);
  }
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new Error(`[${providerId}] failed to parse JSON response`);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function startOfTodayUtcIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function startOfTodayUtcUnixSec(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function startOfTodayUtcMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function todayYmdUtc(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfLocalDayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function firstOfNextMonthIso(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next.toISOString();
}

// Returns ISO of the next midnight America/Los_Angeles. Pacific is UTC-8 (PST)
// or UTC-7 (PDT). We compute the offset for "now" using Intl APIs.
export function nextMidnightPacificIso(): string {
  const now = new Date();
  // Get the components of the current time in LA.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const yLa = get("year");
  const mLa = get("month");
  const dLa = get("day");
  const hLa = get("hour");
  const minLa = get("minute");
  const sLa = get("second");
  // Build "LA wall clock" as a UTC instant; compare to now to derive offset.
  const laAsUtc = Date.UTC(yLa, mLa - 1, dLa, hLa, minLa, sLa);
  const offsetMin = Math.round((laAsUtc - now.getTime()) / 60000);
  // Next LA midnight in LA wall clock = (yLa, mLa, dLa + 1, 00:00).
  const nextLaUtc = Date.UTC(yLa, mLa - 1, dLa + 1, 0, 0, 0);
  // Convert that LA wall clock to a real UTC instant by removing offset.
  return new Date(nextLaUtc - offsetMin * 60000).toISOString();
}
