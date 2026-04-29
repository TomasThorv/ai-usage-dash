import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pollIntervalMs } from "@/lib/config/budgets";
import { startOfLocalDayMs } from "@/lib/providers/_http";
import type {
  ProviderAdapter,
  UsageSnapshot,
  UsageSnapshotModelEntry,
} from "@/lib/providers/types";
import Database from "better-sqlite3";

const PROVIDER_ID = "opencode" as const;

export function defaultDbPath(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    return path.join(home, "AppData", "Roaming", "opencode", "opencode.db");
  }
  return path.join(home, ".local", "share", "opencode", "opencode.db");
}

function resolveDbPath(creds: Record<string, string>): string {
  const override = (creds.dbPath ?? "").trim();
  return override.length > 0 ? override : defaultDbPath();
}

function openReadOnly(file: string): Database.Database {
  if (!existsSync(file)) {
    throw new Error(`[${PROVIDER_ID}] OpenCode database not found at ${file}`);
  }
  // better-sqlite3 supports the readonly option directly.
  return new Database(file, { readonly: true, fileMustExist: true });
}

interface AggRow {
  model: string | null;
  total_input: number | null;
  total_output: number | null;
  total_cache_read: number | null;
  total_cache_write: number | null;
  total_cost: number | null;
  request_count: number | null;
}

function readColumns(db: Database.Database): Set<string> {
  try {
    const rows = db.prepare("PRAGMA table_info(message)").all() as Array<{ name?: string }>;
    return new Set(rows.map((r) => r.name ?? "").filter(Boolean));
  } catch {
    return new Set();
  }
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "OpenCode",
  iconSlug: "opencode",
  status: "unofficial",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "dbPath",
      label: "Path to opencode.db (optional)",
      type: "apiKey",
      secret: false,
      placeholder: "auto-detect",
    },
  ],

  async verify(creds) {
    const file = resolveDbPath(creds);
    const db = openReadOnly(file);
    try {
      db.prepare("SELECT 1").get();
    } finally {
      db.close();
    }
  },

  async fetchUsage(creds): Promise<UsageSnapshot> {
    const file = resolveDbPath(creds);
    const db = openReadOnly(file);
    try {
      const sinceMs = startOfLocalDayMs();
      const cols = readColumns(db);
      const has = (c: string): string => (cols.has(c) ? c : "0");

      const sql = `
        SELECT
          COALESCE(model, 'unknown') AS model,
          SUM(${has("input")})        AS total_input,
          SUM(${has("output")})       AS total_output,
          SUM(${has("cache_read")})   AS total_cache_read,
          SUM(${has("cache_write")})  AS total_cache_write,
          SUM(${has("cost")})         AS total_cost,
          COUNT(*)                    AS request_count
        FROM message
        WHERE role = 'assistant' AND created_at >= ?
        GROUP BY model
      `;

      let rows: AggRow[] = [];
      try {
        rows = db.prepare(sql).all(sinceMs) as AggRow[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : "query_failed";
        throw new Error(`[${PROVIDER_ID}] sqlite query failed: ${msg.slice(0, 120)}`);
      }

      let inputTokens = 0;
      let outputTokens = 0;
      let cacheReadTokens = 0;
      let cacheWriteTokens = 0;
      let costUsd = 0;
      let requests = 0;
      const modelBreakdown: UsageSnapshotModelEntry[] = [];

      for (const r of rows) {
        const inp = Number(r.total_input ?? 0);
        const outp = Number(r.total_output ?? 0);
        const cr = Number(r.total_cache_read ?? 0);
        const cw = Number(r.total_cache_write ?? 0);
        const cost = Number(r.total_cost ?? 0);
        const reqs = Number(r.request_count ?? 0);
        inputTokens += inp;
        outputTokens += outp;
        cacheReadTokens += cr;
        cacheWriteTokens += cw;
        costUsd += cost;
        requests += reqs;
        modelBreakdown.push({
          model: r.model ?? "unknown",
          inputTokens: inp,
          outputTokens: outp,
          requests: reqs,
          costUsd: cost,
        });
      }

      return {
        providerId: PROVIDER_ID,
        fetchedAt: new Date().toISOString(),
        session: {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
          requests,
          costUsd,
        },
        ...(modelBreakdown.length > 0 ? { modelBreakdown } : {}),
      };
    } finally {
      db.close();
    }
  },
};

export default adapter;
