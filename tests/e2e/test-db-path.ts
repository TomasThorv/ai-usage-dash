import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Single source of truth for the e2e SQLite database location. Both the
 * Playwright config (which spawns the Next server with `TEST_DATABASE_PATH`)
 * and the helpers (which write to the same DB from the worker process) read
 * from `process.env.TEST_DATABASE_PATH` if already set; otherwise we generate
 * a fresh per-run temp path and export it.
 *
 * IMPORTANT: this file MUST NOT be imported from the app — it lives under
 * tests/ and only runs in Playwright contexts.
 */
function compute(): string {
  if (process.env.TEST_DATABASE_PATH && process.env.TEST_DATABASE_PATH.length > 0) {
    return process.env.TEST_DATABASE_PATH;
  }
  const dir = join(tmpdir(), `ai-usage-dash-e2e-${process.pid}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "app.db");
  process.env.TEST_DATABASE_PATH = path;
  return path;
}

export const TEST_DB_PATH: string = compute();
export const TEST_MASTER_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
