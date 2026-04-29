import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { env } from "@/lib/config/env";
import Database, { type Database as DB } from "better-sqlite3";

declare global {
  // eslint-disable-next-line no-var
  var __aiUsageDb: DB | undefined;
}

function resolveDbPath(): string {
  const p = env.DATABASE_PATH;
  if (p === ":memory:") return p;
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

export function getDb(): DB {
  if (globalThis.__aiUsageDb) return globalThis.__aiUsageDb;
  const path = resolveDbPath();
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  globalThis.__aiUsageDb = db;
  return db;
}

export function closeDb(): void {
  if (globalThis.__aiUsageDb) {
    globalThis.__aiUsageDb.close();
    globalThis.__aiUsageDb = undefined;
  }
}

export function setDbForTests(db: DB): void {
  globalThis.__aiUsageDb = db;
}
