import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";
import { request } from "@playwright/test";

const BASE_URL = "http://localhost:3210";

/**
 * Read the CSRF cookie value from a request context. The middleware sets
 * `csrf` on the first response. We must visit any page once to receive it.
 */
export async function getCsrfFromRequest(
  ctx: APIRequestContext,
): Promise<{ token: string; cookieHeader: string }> {
  // Touch a route so the middleware issues the cookie. /api/health passes through middleware.
  await ctx.get(`${BASE_URL}/api/health`);
  const state = await ctx.storageState();
  const cookie = state.cookies.find((c) => c.name === "csrf");
  if (!cookie) {
    throw new Error("CSRF cookie not present after touching /api/health");
  }
  return { token: cookie.value, cookieHeader: `csrf=${cookie.value}` };
}

export async function getCsrfFromBrowserContext(ctx: BrowserContext): Promise<string> {
  const cookies = await ctx.cookies(BASE_URL);
  const cookie = cookies.find((c) => c.name === "csrf");
  if (!cookie) {
    throw new Error("CSRF cookie not present in browser context");
  }
  return cookie.value;
}

/**
 * Wipe all credentials + snapshots via the public bulk-delete API. Uses an
 * isolated request context (separate cookie jar) so this never pollutes a test
 * page's storage.
 *
 * Note: the middleware uses the `__Host-` cookie prefix which (in production
 * Next.js) sets Secure=true. Over HTTP the cookie jar will swallow the cookie,
 * so we send it explicitly via the Cookie header instead.
 */
export async function wipeAll(): Promise<void> {
  const ctx = await request.newContext();
  try {
    const { token } = await getCsrfFromRequest(ctx);
    const res = await ctx.delete(`${BASE_URL}/api/credentials`, {
      headers: {
        "x-csrf-token": token,
        cookie: `csrf=${token}`,
        "content-type": "application/json",
      },
      data: { all: true },
    });
    if (!res.ok()) {
      throw new Error(`wipeAll failed: ${res.status()}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/**
 * Seed a single credential through the real POST /api/credentials route. The
 * adapter's verify call is NOT invoked here — we only persist creds, so the
 * dashboard sees a connected provider even without network access.
 */
export async function seedCredentialViaApi(
  providerId: "claude" | "openai" | "cursor" | "opencode" | "gemini" | "copilot",
  creds: Record<string, string>,
): Promise<void> {
  const ctx = await request.newContext();
  try {
    const { token } = await getCsrfFromRequest(ctx);
    const res = await ctx.post(`${BASE_URL}/api/credentials`, {
      headers: {
        "x-csrf-token": token,
        cookie: `csrf=${token}`,
        "content-type": "application/json",
      },
      data: { providerId, creds },
    });
    if (!res.ok()) {
      const body = await res.text();
      throw new Error(`seedCredentialViaApi failed: ${res.status()} ${body}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/**
 * Intercept verify endpoints so the adapter's HTTPS calls are short-circuited.
 * Use this in beforeEach when running the wizard happy-path under test.
 */
export async function mockVerifySuccess(page: Page): Promise<void> {
  await page.route("**/api/credentials/*/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

export const BASE = BASE_URL;
