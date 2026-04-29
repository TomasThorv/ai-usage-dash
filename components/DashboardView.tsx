"use client";

import type { CardStatus } from "@/components/Card/CardHeader";
import { ProviderCard } from "@/components/Card/ProviderCard";
import { DashboardGrid } from "@/components/Grid/DashboardGrid";
import { EmptyState } from "@/components/Grid/EmptyState";
import { SettingsDrawer } from "@/components/Settings/SettingsDrawer";
import type { MasterStatus } from "@/components/TopBar/MasterLiveIndicator";
import { TopBar } from "@/components/TopBar/TopBar";
import type { ProviderId } from "@/lib/providers/types";
import { useUiStore } from "@/lib/store/ui";
import { useUsageStore } from "@/lib/store/usage";
import { type ReactNode, useMemo, useState } from "react";

interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  connected: boolean;
}

interface DashboardViewProps {
  providers: ProviderMeta[];
  initialOpenSettings?: boolean;
}

const STALE_AFTER_MS = 5 * 60 * 1000;

function deriveStatus(
  fetchedAt: string | undefined,
  hasError: boolean,
  hasSnapshot: boolean,
): CardStatus {
  if (hasError) return "error";
  if (!hasSnapshot || !fetchedAt) return "loading";
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return "loading";
  return Date.now() - t > STALE_AFTER_MS ? "stale" : "fresh";
}

export function DashboardView({
  providers,
  initialOpenSettings = false,
}: DashboardViewProps): ReactNode {
  const visible = useUiStore((s) => s.visibleProviders);
  const snapshots = useUsageStore((s) => s.snapshots);
  const errors = useUsageStore((s) => s.errors);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState<boolean>(initialOpenSettings);

  const connectedIds = providers.filter((p) => p.connected).map((p) => p.id);
  const visibleConnected = providers.filter((p) => p.connected && visible.includes(p.id));

  const aggregates = useMemo(() => {
    let tokens = 0;
    let spend = 0;
    let active = 0;
    let liveCount = 0;
    let any = 0;
    for (const id of connectedIds) {
      const s = snapshots[id];
      const err = errors[id];
      any += 1;
      if (s) {
        tokens += s.session.inputTokens + s.session.outputTokens;
        spend += s.session.costUsd;
        active += 1;
        const status = deriveStatus(s.fetchedAt, Boolean(err), true);
        if (status === "fresh") liveCount += 1;
      }
    }
    let masterStatus: MasterStatus = "stale";
    if (any > 0 && liveCount === any) masterStatus = "live";
    else if (liveCount > 0) masterStatus = "partial";
    return { tokens, spend, active, masterStatus };
  }, [connectedIds, snapshots, errors]);

  const items = visibleConnected.map((p) => ({
    id: p.id,
    displayName: p.displayName,
  }));

  return (
    <>
      <TopBar
        totalTokensToday={aggregates.tokens}
        totalSpendToday={aggregates.spend}
        activeProviders={aggregates.active}
        masterStatus={aggregates.masterStatus}
        providers={providers}
      />
      <main className="mx-auto max-w-[1600px] px-4 pt-20 pb-12 sm:px-6">
        {connectedIds.length === 0 ? (
          <EmptyState />
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-sm text-fg-muted">
            All providers hidden. Toggle pills in the top bar.
          </p>
        ) : (
          <DashboardGrid
            items={items}
            renderItem={(item) => {
              const snap = snapshots[item.id];
              const err = errors[item.id];
              const status = deriveStatus(snap?.fetchedAt, Boolean(err), Boolean(snap));
              return (
                <ProviderCard
                  providerId={item.id}
                  displayName={item.displayName}
                  snapshot={snap}
                  status={status}
                  expanded={Boolean(expanded[item.id])}
                  onToggleExpand={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                />
              );
            }}
          />
        )}
      </main>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
