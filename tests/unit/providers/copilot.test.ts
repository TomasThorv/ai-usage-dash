import copilot from "@/lib/providers/copilot";
import { copilotHandlers } from "@/tests/msw/handlers";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const server = setupServer(...copilotHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers(...copilotHandlers));
afterAll(() => server.close());

describe("copilot adapter", () => {
  it("verify succeeds on 200", async () => {
    await expect(
      copilot.verify({ pat: "ghp_test", org: "acme" }, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("verify throws on 401", async () => {
    server.use(
      http.get(
        "https://api.github.com/orgs/:org/copilot/billing",
        () => new HttpResponse("nope", { status: 401 }),
      ),
    );
    await expect(
      copilot.verify({ pat: "ghp_test", org: "acme" }, new AbortController().signal),
    ).rejects.toThrow(/401/);
  });

  it("fetchUsage maps seats quota, cost, requests, output", async () => {
    const snap = await copilot.fetchUsage(
      { pat: "ghp_test", org: "acme" },
      new AbortController().signal,
    );
    expect(snap.providerId).toBe("copilot");
    expect(snap.quota?.unit).toBe("seats");
    expect(snap.quota?.limit).toBe(50);
    expect(snap.quota?.used).toBe(42);
    // 42 seats * $19 (business)
    expect(snap.session.costUsd).toBe(42 * 19);
    expect(snap.session.requests).toBe(1250);
    expect(snap.session.outputTokens).toBe(4800);
    expect(snap.errors).toBeUndefined();
  });
});
