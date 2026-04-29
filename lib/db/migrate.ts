import { getDb } from "@/lib/db/client";
import type { Database as DB } from "better-sqlite3";

const SCHEMA_VERSION = 1;

const MIGRATIONS: ReadonlyArray<string> = [
  `CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL UNIQUE,
    encrypted_blob BLOB NOT NULL,
    created_at INTEGER NOT NULL,
    last_verified_at INTEGER,
    last_error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    provider_id TEXT PRIMARY KEY,
    fetched_at INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  )`,
];

export function migrate(db: DB = getDb()): void {
  for (const stmt of MIGRATIONS) db.exec(stmt);
  const row = db.prepare("SELECT v FROM meta WHERE k = ?").get("schema_version") as
    | { v: string }
    | undefined;
  const current = row ? Number.parseInt(row.v, 10) : 0;
  if (current < SCHEMA_VERSION) {
    db.prepare(
      "INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
    ).run("schema_version", String(SCHEMA_VERSION));
  }
}
