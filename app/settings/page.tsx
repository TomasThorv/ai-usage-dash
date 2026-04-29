import { DashboardLiveBridge } from "@/components/DashboardLiveBridge";
import { DashboardView } from "@/components/DashboardView";
import { boot } from "@/lib/boot";
import * as credentialsDb from "@/lib/db/credentials";
import { listAdapters } from "@/lib/providers/registry";
import * as cache from "@/lib/realtime/cache";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SettingsPage(): Promise<ReactNode> {
  await boot();
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
      <DashboardView providers={providers} initialOpenSettings />
    </>
  );
}
