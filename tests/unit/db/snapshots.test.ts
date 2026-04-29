import { closeDb, setDbForTests } from "@/lib/db/client";
import { migrate } from "@/lib/db/migrate";
import * as snapshots from "@/lib/db/snapshots";
import type { UsageSnapshot } from "@/lib/providers/types";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function fakeSnapshot(providerId: UsageSnapshot["providerId"]): UsageSnapshot {
  return {
    providerId,
    fetchedAt: new Date().toISOString(),
    session: { inputTokens: 1, outputTokens: 2, requests: 3, costUsd: 0.4 },
  };
}

describe("snapshots db", () => {
  beforeEach(() => {
    closeDb();
    const db = new Database(":memory:");
    db.pragma("journal_mode = MEMORY");
    setDbForTests(db);
    migrate(db);
  });

  afterEach(() => {
    closeDb();
  });

  it("upsert/get round-trip preserves payload", () => {
    const s = fakeSnapshot("claude");
    snapshots.upsert(s);
    const got = snapshots.get("claude");
    expect(got?.providerId).toBe("claude");
    expect(got?.session.requests).toBe(3);
  });

  it("deleteAll wipes every snapshot row", () => {
    snapshots.upsert(fakeSnapshot("claude"));
    snapshots.upsert(fakeSnapshot("openai"));
    expect(snapshots.getAll()).toHaveLength(2);

    const removed = snapshots.deleteAll();
    expect(removed).toBe(2);
    expect(snapshots.getAll()).toHaveLength(0);
  });
});
