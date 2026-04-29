import openai from "@/lib/providers/openai";
import { openaiHandlers } from "@/tests/msw/handlers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const server = setupServer(...openaiHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers(...openaiHandlers));
afterAll(() => server.close());

describe("openai adapter", () => {
  it("verify succeeds on 200", async () => {
    await expect(
      openai.verify({ adminKey: "sk-admin-test" }, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("verify throws on 401", async () => {
    server.use(
      http.get(
        "https://api.openai.com/v1/organization/usage/completions",
        () => new HttpResponse("nope", { status: 401 }),
      ),
    );
    await expect(
      openai.verify({ adminKey: "sk-admin-test" }, new AbortController().signal),
    ).rejects.toThrow(/401/);
  });

  it("fetchUsage aggregates tokens, requests, cost, and model breakdown", async () => {
    const snap = await openai.fetchUsage(
      { adminKey: "sk-admin-test" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("openai");
    expect(snap.session.inputTokens).toBe(58000);
    expect(snap.session.outputTokens).toBe(14000);
    expect(snap.session.cacheReadTokens).toBe(5000);
    expect(snap.session.requests).toBe(35);
    expect(snap.session.costUsd).toBeCloseTo(4.55, 4);
    expect(snap.modelBreakdown?.length).toBe(2);
    expect(snap.modelBreakdown?.[0]?.model).toBe("gpt-4.1");
    expect(snap.modelBreakdown?.[0]?.requests).toBe(25);
  });
});
