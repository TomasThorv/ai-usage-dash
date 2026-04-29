import claude from "@/lib/providers/claude";
import { claudeHandlers } from "@/tests/msw/handlers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const server = setupServer(...claudeHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers(...claudeHandlers));
afterAll(() => server.close());

describe("claude adapter", () => {
  it("verify succeeds on 200", async () => {
    await expect(
      claude.verify({ adminKey: "sk-ant-admin01-test" }, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("verify throws on 401", async () => {
    server.use(
      http.get(
        "https://api.anthropic.com/v1/organizations/usage_report/messages",
        () => new HttpResponse("unauthorized", { status: 401 }),
      ),
    );
    await expect(
      claude.verify({ adminKey: "sk-ant-admin01-test" }, new AbortController().signal),
    ).rejects.toThrow(/401/);
  });

  it("fetchUsage aggregates tokens, cost (cents/100), and model breakdown", async () => {
    const snap = await claude.fetchUsage(
      { adminKey: "sk-ant-admin01-test" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("claude");
    // 12000 + 3000
    expect(snap.session.inputTokens).toBe(15000);
    // 8000 + 4000
    expect(snap.session.outputTokens).toBe(12000);
    // 5000 + 1000
    expect(snap.session.cacheReadTokens).toBe(6000);
    // 1000 + 500 + 200 + 0
    expect(snap.session.cacheWriteTokens).toBe(1700);
    // (1234.56 + 789.00) / 100
    expect(snap.session.costUsd).toBeCloseTo(20.2356, 4);
    expect(snap.modelBreakdown?.length).toBe(2);
    expect(snap.modelBreakdown?.[0]?.model).toBe("claude-sonnet-4-5");
  });

  it("fetchUsage does not echo creds when upstream errors", async () => {
    server.use(
      http.get(
        "https://api.anthropic.com/v1/organizations/usage_report/messages",
        () => new HttpResponse("boom", { status: 500 }),
      ),
    );
    const secret = "sk-ant-admin01-SECRETSAUCE";
    await expect(
      claude.fetchUsage({ adminKey: secret }, new AbortController().signal),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(secret),
      }),
    );
  });
});
