import { loadOrCreate } from "@/lib/crypto/masterKey";
import { open as sealOpen } from "@/lib/crypto/sealedBox";
import { getDb } from "@/lib/db/client";
import * as credentialsDb from "@/lib/db/credentials";
import { migrate } from "@/lib/db/migrate";
import { listAdapters } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";
import * as cache from "@/lib/realtime/cache";
import { getPoller } from "@/lib/realtime/poller";
import sodium from "libsodium-wrappers-sumo";

declare global {
  // eslint-disable-next-line no-var
  var __aiUsageBooted: Promise<void> | undefined;
}

async function resolveCreds(id: ProviderId): Promise<Record<string, string> | null> {
  const row = credentialsDb.get(id);
  if (!row) return null;
  try {
    const json = await sealOpen(row.encryptedBlob);
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return null;
  }
}

async function bootImpl(): Promise<void> {
  await sodium.ready;
  loadOrCreate();
  getDb();
  migrate();
  cache.hydrate();

  const poller = getPoller(resolveCreds);
  for (const a of listAdapters()) poller.register(a);
  poller.start();
}

export function boot(): Promise<void> {
  if (!globalThis.__aiUsageBooted) {
    globalThis.__aiUsageBooted = bootImpl();
  }
  return globalThis.__aiUsageBooted;
}
