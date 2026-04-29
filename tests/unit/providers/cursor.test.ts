import cursor from "@/lib/providers/cursor";
import { cursorApiKeyHandlers, cursorCookieHandlers } from "@/tests/msw/handlers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const server = setupServer(...cursorApiKeyHandlers, ...cursorCookieHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers(...cursorApiKeyHandlers, ...cursorCookieHandlers));
afterAll(() => server.close());

describe("cursor adapter (apiKey)", () => {
  it("verify succeeds on 200", async () => {
    await expect(
      cursor.verify({ mode: "apiKey", apiKey: "key_test" }, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("verify throws on 401", async () => {
    server.use(
      http.post(
        "https://api.cursor.com/teams/filtered-usage-events",
        () => new HttpResponse("nope", { status: 401 }),
      ),
    );
    await expect(
      cursor.verify({ mode: "apiKey", apiKey: "key_test" }, new AbortController().signal),
    ).rejects.toThrow(/401/);
  });

  it("fetchUsage aggregates events and uses team spend total", async () => {
    const snap = await cursor.fetchUsage(
      { mode: "apiKey", apiKey: "key_test" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("cursor");
    // 1000 + 800 + 600
    expect(snap.session.inputTokens).toBe(2400);
    // 500 + 300 + 200
    expect(snap.session.outputTokens).toBe(1000);
    expect(snap.session.cacheReadTokens).toBe(250);
    expect(snap.session.cacheWriteTokens).toBe(100);
    expect(snap.session.requests).toBe(3);
    // teamMemberSpend: (1500 + 800) / 100
    expect(snap.session.costUsd).toBeCloseTo(23, 4);
    expect(snap.modelBreakdown?.find((m) => m.model === "claude-sonnet-4-5")?.requests).toBe(2);
  });
});

describe("cursor adapter (cookie)", () => {
  it("fetchUsage maps quota and spend from cookie response", async () => {
    const snap = await cursor.fetchUsage(
      { mode: "cookie", cookie: "tok_test" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("cursor");
    expect(snap.session.requests).toBe(250);
    expect(snap.session.costUsd).toBeCloseTo(12.34, 4);
    expect(snap.quota?.unit).toBe("requests");
    expect(snap.quota?.limit).toBe(500);
    expect(snap.quota?.used).toBe(250);
    expect(snap.errors?.length).toBeGreaterThan(0);
  });
});
