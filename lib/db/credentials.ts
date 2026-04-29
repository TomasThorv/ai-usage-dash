import { getDb } from "@/lib/db/client";
import type { ProviderId } from "@/lib/providers/types";
import type { Database as DB } from "better-sqlite3";

export interface CredentialRow {
  id: string;
  providerId: ProviderId;
  encryptedBlob: Uint8Array;
  createdAt: number;
  lastVerifiedAt: number | null;
  lastError: string | null;
}

interface RawRow {
  id: string;
  provider_id: ProviderId;
  encrypted_blob: Buffer;
  created_at: number;
  last_verified_at: number | null;
  last_error: string | null;
}

function map(row: RawRow): CredentialRow {
  return {
    id: row.id,
    providerId: row.provider_id,
    encryptedBlob: new Uint8Array(row.encrypted_blob),
    createdAt: row.created_at,
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
  };
}

export function count(db: DB = getDb()): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM credentials").get() as {
    c: number;
  };
  return row.c;
}

export function upsert(providerId: ProviderId, encryptedBlob: Uint8Array, db: DB = getDb()): void {
  const id = providerId;
  const now = Date.now();
  db.prepare(
    `INSERT INTO credentials (id, provider_id, encrypted_blob, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(provider_id) DO UPDATE SET
       encrypted_blob = excluded.encrypted_blob,
       last_error = NULL`,
  ).run(id, providerId, Buffer.from(encryptedBlob), now);
}

export function get(providerId: ProviderId, db: DB = getDb()): CredentialRow | undefined {
  const row = db.prepare("SELECT * FROM credentials WHERE provider_id = ?").get(providerId) as
    | RawRow
    | undefined;
  return row ? map(row) : undefined;
}

export function listAll(db: DB = getDb()): CredentialRow[] {
  const rows = db.prepare("SELECT * FROM credentials ORDER BY provider_id ASC").all() as RawRow[];
  return rows.map(map);
}

export function remove(providerId: ProviderId, db: DB = getDb()): void {
  db.prepare("DELETE FROM credentials WHERE provider_id = ?").run(providerId);
}

export function deleteAll(db: DB = getDb()): number {
  const info = db.prepare("DELETE FROM credentials").run();
  return info.changes;
}

export function markVerified(providerId: ProviderId, db: DB = getDb()): void {
  db.prepare(
    "UPDATE credentials SET last_verified_at = ?, last_error = NULL WHERE provider_id = ?",
  ).run(Date.now(), providerId);
}

export function setError(providerId: ProviderId, msg: string, db: DB = getDb()): void {
  db.prepare("UPDATE credentials SET last_error = ? WHERE provider_id = ?").run(msg, providerId);
}
