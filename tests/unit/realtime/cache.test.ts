import { closeDb, setDbForTests } from "@/lib/db/client";
import { migrate } from "@/lib/db/migrate";
import type { UsageSnapshot } from "@/lib/providers/types";
import * as cache from "@/lib/realtime/cache";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function snap(): UsageSnapshot {
  return {
    providerId: "claude",
    fetchedAt: new Date().toISOString(),
    session: {
      inputTokens: 1,
      outputTokens: 2,
      requests: 1,
      costUsd: 0.01,
    },
  };
}

describe("realtime cache", () => {
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
  });

  it("set then getAll returns snapshot", () => {
    const s = snap();
    cache.set(s);
    const all = cache.getAll();
    expect(all.length).toBe(1);
    expect(all[0]?.providerId).toBe("claude");
    expect(cache.get("claude")?.session.inputTokens).toBe(1);
  });

  it("hydrate reads from db", () => {
    const s = snap();
    cache.set(s);
    cache.clear();
    expect(cache.getAll().length).toBe(0);
    cache.hydrate();
    expect(cache.getAll().length).toBe(1);
  });
});
