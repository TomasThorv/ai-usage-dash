import { getDb } from "@/lib/db/client";
import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";
import type { Database as DB } from "better-sqlite3";

interface RawRow {
  provider_id: ProviderId;
  fetched_at: number;
  payload_json: string;
}

function parse(row: RawRow): UsageSnapshot {
  return JSON.parse(row.payload_json) as UsageSnapshot;
}

export function upsert(snapshot: UsageSnapshot, db: DB = getDb()): void {
  db.prepare(
    `INSERT INTO snapshots (provider_id, fetched_at, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(provider_id) DO UPDATE SET
       fetched_at = excluded.fetched_at,
       payload_json = excluded.payload_json`,
  ).run(snapshot.providerId, Date.parse(snapshot.fetchedAt), JSON.stringify(snapshot));
}

export function getAll(db: DB = getDb()): UsageSnapshot[] {
  const rows = db.prepare("SELECT * FROM snapshots ORDER BY provider_id ASC").all() as RawRow[];
  return rows.map(parse);
}

export function get(providerId: ProviderId, db: DB = getDb()): UsageSnapshot | undefined {
  const row = db.prepare("SELECT * FROM snapshots WHERE provider_id = ?").get(providerId) as
    | RawRow
    | undefined;
  return row ? parse(row) : undefined;
}

export function deleteAll(db: DB = getDb()): number {
  const info = db.prepare("DELETE FROM snapshots").run();
  return info.changes;
}
