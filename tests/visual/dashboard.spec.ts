import { expect, request, test } from "@playwright/test";
import Database from "better-sqlite3";
import { TEST_DB_PATH } from "../e2e/test-db-path";

const BASE = "http://localhost:3210";

async function csrf(): Promise<string> {
  const ctx = await request.newContext();
  await ctx.get(`${BASE}/api/health`);
  const state = await ctx.storageState();
  await ctx.dispose();
  const c = state.cookies.find((x) => x.name === "csrf");
  if (!c) throw new Error("no csrf cookie");
  return c.value;
}

async function wipe(): Promise<void> {
  const ctx = await request.newContext();
  try {
    await ctx.get(`${BASE}/api/health`);
    const state = await ctx.storageState();
    const c = state.cookies.find((x) => x.name === "csrf");
    if (!c) throw new Error("no csrf cookie");
    const res = await ctx.delete(`${BASE}/api/credentials`, {
      headers: {
        "x-csrf-token": c.value,
        cookie: `csrf=${c.value}`,
        "content-type": "application/json",
      },
      data: { all: true },
    });
    if (!res.ok()) throw new Error(`wipe failed: ${res.status()}`);
  } finally {
    await ctx.dispose();
  }
}

async function seedClaude(): Promise<void> {
  const token = await csrf();
  const ctx = await request.newContext();
  try {
    const res = await ctx.post(`${BASE}/api/credentials`, {
      headers: {
        "x-csrf-token": token,
        cookie: `csrf=${token}`,
        "content-type": "application/json",
      },
      data: { providerId: "claude", creds: { adminKey: "sk-ant-admin01-test" } },
    });
    if (!res.ok()) throw new Error(`seed creds failed: ${res.status()}`);
  } finally {
    await ctx.dispose();
  }

  const db = new Database(TEST_DB_PATH);
  try {
    const fixed = "2026-04-29T12:00:00.000Z";
    const reset = "2026-04-29T13:00:00.000Z";
    const payload = {
      providerId: "claude",
      fetchedAt: fixed,
      session: {
        inputTokens: 12345,
        outputTokens: 6789,
        requests: 42,
        costUsd: 1.23,
      },
      quota: {
        period: "day",
        limit: 1_000_000,
        used: 500_000,
        unit: "tokens",
        resetsAt: reset,
      },
    };
    db.prepare(
      `INSERT INTO snapshots (provider_id, fetched_at, payload_json)
       VALUES (?, ?, ?)
       ON CONFLICT(provider_id) DO UPDATE SET
         fetched_at = excluded.fetched_at,
         payload_json = excluded.payload_json`,
    ).run("claude", Date.parse(fixed), JSON.stringify(payload));
  } finally {
    db.close();
  }
}

const NO_ANIMATION_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

async function freezeAndDisableMotion(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __visualMode?: boolean }).__visualMode = true;
    // Freeze Date.now()
    const FROZEN = Date.parse("2026-04-29T12:00:00.000Z");
    const originalNow = Date.now;
    Date.now = () => FROZEN;
    // Keep original around in case tests need it later
    (window as unknown as { __originalNow?: typeof originalNow }).__originalNow = originalNow;
  });
  await page.addStyleTag({ content: NO_ANIMATION_CSS }).catch(() => undefined);
}

test.describe("visual regression", () => {
  test("setup wizard step=select", async ({ page }) => {
    await wipe();
    await freezeAndDisableMotion(page);
    await page.goto("/setup?step=select");
    await page.getByRole("heading", { name: "Pick providers" }).waitFor();
    // Inject the no-animation styles after navigation too (init-script style tag is brittle).
    await page.addStyleTag({ content: NO_ANIMATION_CSS });
    await expect(page).toHaveScreenshot("setup-select.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("dashboard with one seeded provider", async ({ page }) => {
    await wipe();
    await seedClaude();
    await freezeAndDisableMotion(page);

    // Block SSE so the dashboard doesn't repaint mid-screenshot.
    await page.route("**/api/stream", (route) => route.fulfill({ status: 204, body: "" }));

    await page.goto("/");
    await page.locator('main [data-provider="claude"][aria-live="polite"]').waitFor();
    await page.addStyleTag({ content: NO_ANIMATION_CSS });
    await expect(page).toHaveScreenshot("dashboard.png", {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });
});
