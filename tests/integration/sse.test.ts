import { GET } from "@/app/api/stream/route";
import { setDbForTests } from "@/lib/db/client";
import { migrate } from "@/lib/db/migrate";
import type { UsageSnapshot } from "@/lib/providers/types";
import { getBus } from "@/lib/realtime/bus";
import * as cache from "@/lib/realtime/cache";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("/api/stream SSE", () => {
  beforeEach(() => {
    const db = new Database(":memory:");
    setDbForTests(db);
    migrate(db);
    cache.clear();
    // Reset boot memo so the route's boot() resolves against the fresh in-memory db.
    (globalThis as { __aiUsageBooted?: Promise<void> }).__aiUsageBooted = Promise.resolve();
  });

  afterEach(() => {
    cache.clear();
  });

  it("emits snapshot frames for bus events", async () => {
    const req = new Request("http://localhost/api/stream", { method: "GET" });
    const res = await GET(req);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const body = res.body;
    if (!body) throw new Error("expected response body");
    const reader = body.getReader();
    const decoder = new TextDecoder();

    const snap: UsageSnapshot = {
      providerId: "claude",
      fetchedAt: new Date().toISOString(),
      session: { inputTokens: 1, outputTokens: 2, requests: 1, costUsd: 0 },
    };

    // Emit after subscribe is wired (next microtask).
    setImmediate(() => {
      getBus().emit("snapshot", snap);
    });

    // Read with a hard timeout so an issue can't hang the test.
    let chunks = "";
    const deadline = Date.now() + 3_000;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks += decoder.decode(value, { stream: true });
      if (chunks.includes("event: snapshot") && chunks.includes("claude")) break;
    }
    await reader.cancel();

    expect(chunks).toContain("event: snapshot");
    expect(chunks).toContain("claude");
  });
});
