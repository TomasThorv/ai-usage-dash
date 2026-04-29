import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import opencode from "@/lib/providers/opencode";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface SeedRow {
  id: string;
  session_id: string;
  role: string;
  model: string;
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
  cost: number;
  created_at: number;
}

let tmpDir: string;
let dbPath: string;

function seed(rows: SeedRow[]): void {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE message (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      model TEXT,
      input INTEGER DEFAULT 0,
      output INTEGER DEFAULT 0,
      reasoning INTEGER DEFAULT 0,
      cache_read INTEGER DEFAULT 0,
      cache_write INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
  const stmt = db.prepare(
    `INSERT INTO message
      (id, session_id, role, model, input, output, cache_read, cache_write, cost, created_at)
      VALUES (@id, @session_id, @role, @model, @input, @output, @cache_read, @cache_write, @cost, @created_at)`,
  );
  for (const r of rows) stmt.run(r);
  db.close();
}

beforeEach(() => {
  tmpDir = mkdtempSync(path.join(tmpdir(), "ocdb-"));
  dbPath = path.join(tmpDir, "opencode.db");
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("opencode adapter", () => {
  it("verify throws when db file is missing", async () => {
    await expect(
      opencode.verify({ dbPath: path.join(tmpDir, "nope.db") }, new AbortController().signal),
    ).rejects.toThrow(/not found/);
  });

  it("verify succeeds when db exists", async () => {
    seed([]);
    await expect(
      opencode.verify({ dbPath }, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it("fetchUsage aggregates tokens/cost across two models", async () => {
    const now = Date.now();
    seed([
      {
        id: "m1",
        session_id: "s1",
        role: "assistant",
        model: "claude-sonnet-4-5",
        input: 1000,
        output: 500,
        cache_read: 200,
        cache_write: 100,
        cost: 0.0125,
        created_at: now - 1000,
      },
      {
        id: "m2",
        session_id: "s1",
        role: "assistant",
        model: "claude-sonnet-4-5",
        input: 600,
        output: 200,
        cache_read: 50,
        cache_write: 0,
        cost: 0.005,
        created_at: now - 500,
      },
      {
        id: "m3",
        session_id: "s2",
        role: "assistant",
        model: "gpt-4.1",
        input: 800,
        output: 300,
        cache_read: 0,
        cache_write: 0,
        cost: 0.0075,
        created_at: now - 100,
      },
    ]);
    const snap = await opencode.fetchUsage({ dbPath }, new AbortController().signal);
    expect(snap.providerId).toBe("opencode");
    expect(snap.session.inputTokens).toBe(2400);
    expect(snap.session.outputTokens).toBe(1000);
    expect(snap.session.cacheReadTokens).toBe(250);
    expect(snap.session.cacheWriteTokens).toBe(100);
    expect(snap.session.requests).toBe(3);
    expect(snap.session.costUsd).toBeCloseTo(0.025, 6);
    expect(snap.modelBreakdown?.length).toBe(2);
    const sonnet = snap.modelBreakdown?.find((m) => m.model === "claude-sonnet-4-5");
    expect(sonnet?.requests).toBe(2);
    expect(sonnet?.inputTokens).toBe(1600);
  });

  it("excludes user messages and rows older than today", async () => {
    const now = Date.now();
    const yesterday = now - 36 * 60 * 60 * 1000;
    seed([
      {
        id: "user1",
        session_id: "s",
        role: "user",
        model: "claude-sonnet-4-5",
        input: 9999,
        output: 0,
        cache_read: 0,
        cache_write: 0,
        cost: 999,
        created_at: now,
      },
      {
        id: "old",
        session_id: "s",
        role: "assistant",
        model: "claude-sonnet-4-5",
        input: 7777,
        output: 0,
        cache_read: 0,
        cache_write: 0,
        cost: 777,
        created_at: yesterday,
      },
      {
        id: "today",
        session_id: "s",
        role: "assistant",
        model: "claude-sonnet-4-5",
        input: 100,
        output: 50,
        cache_read: 0,
        cache_write: 0,
        cost: 0.001,
        created_at: now,
      },
    ]);
    const snap = await opencode.fetchUsage({ dbPath }, new AbortController().signal);
    expect(snap.session.inputTokens).toBe(100);
    expect(snap.session.outputTokens).toBe(50);
    expect(snap.session.requests).toBe(1);
  });
});
