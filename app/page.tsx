import { DashboardLiveBridge } from "@/components/DashboardLiveBridge";
import { DashboardView } from "@/components/DashboardView";
import { boot } from "@/lib/boot";
import * as credentialsDb from "@/lib/db/credentials";
import { listAdapters } from "@/lib/providers/registry";
import * as cache from "@/lib/realtime/cache";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COUNT_TTL_MS = 5_000;

declare global {
  // eslint-disable-next-line no-var
  var __credCount: { value: number; expiresAt: number } | undefined;
}

function readCount(): number {
  const cached = globalThis.__credCount;
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;
  try {
    const value = credentialsDb.count();
    globalThis.__credCount = { value, expiresAt: now + COUNT_TTL_MS };
    return value;
  } catch {
    return 1;
  }
}

export default async function HomePage(): Promise<ReactNode> {
  try {
    await boot();
  } catch (err) {
    console.error("home: boot failed", err instanceof Error ? err.message : "unknown");
  }
  if (readCount() === 0) {
    redirect("/setup?step=select");
  }

  // Re-hydrate from durable storage on every render. Boot's initial hydrate is
  // a one-shot — we want the SSR shell to reflect snapshots written after boot
  // (e.g. by the poller running in another worker, or by tests seeding rows).
  try {
    cache.hydrate();
  } catch {
    // tolerate — cache.getAll() will fall back to whatever's already in memory
  }

  const initial = cache.getAll();
  const connected = new Set(credentialsDb.listAll().map((r) => r.providerId));
  const providers = listAdapters().map((a) => ({
    id: a.id,
    displayName: a.displayName,
    connected: connected.has(a.id),
  }));

  return (
    <>
      <DashboardLiveBridge initial={initial} />
      <DashboardView providers={providers} />
    </>
  );
}
