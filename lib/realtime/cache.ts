import * as snapshotsDb from "@/lib/db/snapshots";
import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";

declare global {
  // eslint-disable-next-line no-var
  var __aiUsageCache: Map<ProviderId, UsageSnapshot> | undefined;
}

function store(): Map<ProviderId, UsageSnapshot> {
  if (!globalThis.__aiUsageCache) {
    globalThis.__aiUsageCache = new Map();
  }
  return globalThis.__aiUsageCache;
}

export function hydrate(): void {
  const map = store();
  map.clear();
  for (const s of snapshotsDb.getAll()) {
    map.set(s.providerId, s);
  }
}

export function set(s: UsageSnapshot): void {
  store().set(s.providerId, s);
  snapshotsDb.upsert(s);
}

export function setMemoryOnly(s: UsageSnapshot): void {
  store().set(s.providerId, s);
}

export function getAll(): UsageSnapshot[] {
  return Array.from(store().values());
}

export function get(id: ProviderId): UsageSnapshot | undefined {
  return store().get(id);
}

export function clear(): void {
  store().clear();
}
