import { randomBytes } from "node:crypto";
import {
  accessSync,
  appendFileSync,
  existsSync,
  constants as fsConstants,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { env, reloadEnv } from "@/lib/config/env";

const ENV_LOCAL_PATH = resolve(process.cwd(), ".env.local");

function canWrite(target: string): boolean {
  try {
    if (existsSync(target)) {
      accessSync(target, fsConstants.W_OK);
      return true;
    }
    accessSync(dirname(target), fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

let warned = false;

export function loadOrCreate(): Uint8Array {
  if (env.MASTER_KEY) {
    return new Uint8Array(Buffer.from(env.MASTER_KEY, "base64"));
  }

  if (env.NODE_ENV === "production") {
    throw new Error("MASTER_KEY required in production");
  }

  if (!canWrite(ENV_LOCAL_PATH)) {
    throw new Error("MASTER_KEY not set and .env.local is not writable; cannot bootstrap");
  }

  const raw = randomBytes(32);
  const b64 = raw.toString("base64");

  const line = `MASTER_KEY=${b64}\n`;
  if (existsSync(ENV_LOCAL_PATH)) {
    appendFileSync(ENV_LOCAL_PATH, line, { encoding: "utf8" });
  } else {
    writeFileSync(ENV_LOCAL_PATH, line, { encoding: "utf8" });
  }

  process.env.MASTER_KEY = b64;
  reloadEnv();

  if (!warned) {
    warned = true;
    console.warn("[ai-usage-dash] generated new MASTER_KEY and wrote it to .env.local");
  }

  return new Uint8Array(raw);
}
