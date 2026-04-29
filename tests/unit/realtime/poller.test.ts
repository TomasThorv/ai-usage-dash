import { closeDb, setDbForTests } from "@/lib/db/client";
import { migrate } from "@/lib/db/migrate";
import type { ProviderAdapter, UsageSnapshot } from "@/lib/providers/types";
import { getBus } from "@/lib/realtime/bus";
import * as cache from "@/lib/realtime/cache";
import { Poller } from "@/lib/realtime/poller";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeSnap(): UsageSnapshot {
  return {
    providerId: "claude",
    fetchedAt: new Date().toISOString(),
    session: {
      inputTokens: 5,
      outputTokens: 5,
      requests: 1,
      costUsd: 0,
    },
  };
}

describe("Poller", () => {
  beforeEach(() => {
    closeDb();
    const db = new Database(":memory:");
    db.pragma("journal_mode = MEMORY");
    setDbForTests(db);
    migrate(db);
    cache.clear();
  });

  afterEach(() => {
    closeDb();
    cache.clear();
    vi.useRealTimers();
  });

  it("reentrancy guard prevents overlap", async () => {
    let active = 0;
    let maxActive = 0;
    const adapter: ProviderAdapter = {
      id: "claude",
      displayName: "C",
      iconSlug: "c",
      authFields: [],
      pollIntervalMs: 1000,
      status: "official",
      async fetchUsage() {
        active++;
        if (active > maxActive) maxActive = active;
        await new Promise((r) => setTimeout(r, 50));
        active--;
        return makeSnap();
      },
      async verify() {
        return;
      },
    };
    const poller = new Poller(async () => ({ apiKey: "x" }));
    poller.register(adapter);

    const a = poller.tick(adapter);
    const b = poller.tick(adapter);
    await Promise.all([a, b]);

    expect(maxActive).toBe(1);
  });

  it("error emission preserves cache", async () => {
    const goodSnap = makeSnap();
    cache.set(goodSnap);

    const events: { kind: string; message: string }[] = [];
    const bus = getBus();
    bus.on("error", (e) => events.push({ kind: e.kind, message: e.message }));

    const failingAdapter: ProviderAdapter = {
      id: "claude",
      displayName: "C",
      iconSlug: "c",
      authFields: [],
      pollIntervalMs: 1000,
      status: "official",
      async fetchUsage() {
        throw new Error("401 unauthorized");
      },
      async verify() {
        return;
      },
    };

    const poller = new Poller(async () => ({ apiKey: "x" }));
    poller.register(failingAdapter);
    await poller.tick(failingAdapter);

    expect(events.length).toBe(1);
    expect(events[0]?.kind).toBe("auth");
    expect(cache.get("claude")?.session.inputTokens).toBe(goodSnap.session.inputTokens);
  });
});
