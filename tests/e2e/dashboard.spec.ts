import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { seedCredentialViaApi, wipeAll } from "./helpers";
import { TEST_DB_PATH } from "./test-db-path";

interface SnapshotPayload {
  providerId: string;
  fetchedAt: string;
  session: {
    inputTokens: number;
    outputTokens: number;
    requests: number;
    costUsd: number;
  };
  quota: {
    period: "day";
    limit: number;
    used: number;
    unit: "tokens";
    resetsAt: string;
  };
}

/**
 * Insert a fake snapshot directly into the SQLite snapshots table the running
 * Next.js webServer is using. Cache hydrates from this on the next page load.
 */
function seedSnapshot(snapshot: SnapshotPayload): void {
  const db = new Database(TEST_DB_PATH);
  try {
    db.prepare(
      `INSERT INTO snapshots (provider_id, fetched_at, payload_json)
       VALUES (?, ?, ?)
       ON CONFLICT(provider_id) DO UPDATE SET
         fetched_at = excluded.fetched_at,
         payload_json = excluded.payload_json`,
    ).run(snapshot.providerId, Date.parse(snapshot.fetchedAt), JSON.stringify(snapshot));
  } finally {
    db.close();
  }
}

test.describe("dashboard renders pre-seeded provider", () => {
  test.beforeEach(async () => {
    await wipeAll();
  });

  test("ProviderCard shows name and Countdown ticks", async ({ page }) => {
    // 1. Seed a credential through the public API so middleware count >= 1.
    await seedCredentialViaApi("claude", { adminKey: "sk-ant-admin01-test" });

    // 2. Seed a snapshot directly so the dashboard has something to render.
    const resetIso = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min from now
    seedSnapshot({
      providerId: "claude",
      fetchedAt: new Date().toISOString(),
      session: {
        inputTokens: 12_345,
        outputTokens: 6_789,
        requests: 42,
        costUsd: 1.23,
      },
      quota: {
        period: "day",
        limit: 1_000_000,
        used: 500_000,
        unit: "tokens",
        resetsAt: resetIso,
      },
    });

    // Block the SSE multiplexer so the page doesn't overwrite our seeded
    // snapshot mid-test with poller-driven data.
    await page.route("**/api/stream", (route) => route.fulfill({ status: 204, body: "" }));

    // 3. Visit dashboard.
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);

    // ProviderCard with Claude rendered (the picker pill in the top bar also has
    // data-provider="claude" — narrow to the live region inside <main>).
    const card = page.locator('main [data-provider="claude"][aria-live="polite"]');
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: /Claude/ })).toBeVisible();

    // Countdown text matches mm:ss (e.g. "4:59" or "5:00").
    const countdown = card.locator("span.tabular-nums").filter({ hasText: /^\d+:\d{2}$/ });
    await expect(countdown.first()).toBeVisible();
    const initial = await countdown.first().textContent();
    expect(initial).toMatch(/^\d+:\d{2}$/);

    // Wait > 1s and assert text changed (Countdown ticks every 1000ms).
    await page.waitForTimeout(1200);
    const updated = await countdown.first().textContent();
    expect(updated).toMatch(/^\d+:\d{2}$/);
    expect(updated).not.toEqual(initial);
  });
});
