"use client";

import { CardFooter } from "@/components/Card/CardFooter";
import { CardHeader, type CardStatus } from "@/components/Card/CardHeader";
import { Card } from "@/components/Card/Card";
import { ModelBreakdownTable } from "@/components/Card/ModelBreakdownTable";
import { CountUp } from "@/components/CountUp/CountUp";
import { Countdown } from "@/components/CountUp/Countdown";
import { QuotaRing } from "@/components/QuotaRing/QuotaRing";
import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { ReactNode } from "react";

interface ProviderCardProps {
  providerId: ProviderId;
  displayName: string;
  snapshot: UsageSnapshot | null;
  status: CardStatus;
  expanded: boolean;
  onToggleExpand: () => void;
}

function quotaUnitLabel(unit: string | undefined): string {
  switch (unit) {
    case "tokens":
      return "tokens";
    case "requests":
      return "reqs";
    case "usd":
      return "USD";
    case "seats":
      return "seats";
    default:
      return "";
  }
}

export function ProviderCard({
  providerId: _providerId,
  displayName,
  snapshot,
  status,
  expanded,
  onToggleExpand,
}: ProviderCardProps): ReactNode {
  const session = snapshot?.session ?? {
    inputTokens: 0,
    outputTokens: 0,
    requests: 0,
    costUsd: 0,
  };
  const totalTokens = session.inputTokens + session.outputTokens;
  const inPct = totalTokens > 0 ? (session.inputTokens / totalTokens) * 100 : 0;
  const outPct = totalTokens > 0 ? (session.outputTokens / totalTokens) * 100 : 0;

  const lastUpdated =
    snapshot?.fetchedAt && !Number.isNaN(Date.parse(snapshot.fetchedAt))
      ? Date.parse(snapshot.fetchedAt)
      : null;

  const quota = snapshot?.quota;
  const breakdown = snapshot?.modelBreakdown ?? [];

  return (
    <Card interactive className="min-h-[220px] p-5">
      <div
        aria-live="polite"
        aria-atomic="true"
        className="flex h-full flex-col"
        data-provider={_providerId}
      >
        <CardHeader name={displayName} status={status} lastUpdatedMs={lastUpdated} />

        <div className="mt-5 grid grid-cols-[1fr_auto] items-center gap-5">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-[11px] text-fg-faint">
                <span>Tokens</span>
                <span>
                  <CountUp value={session.inputTokens} mono format={formatNumber} /> in ·{" "}
                  <CountUp value={session.outputTokens} mono format={formatNumber} /> out
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-accent/70 transition-[width] duration-500"
                  style={{ width: `${inPct}%` }}
                  aria-hidden="true"
                />
                <div
                  className="h-full bg-accent/70 transition-[width] duration-500"
                  style={{ width: `${outPct}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex items-baseline justify-between text-[11px] text-fg-faint">
              <span>Requests</span>
              <CountUp
                value={session.requests}
                mono
                format={formatNumber}
                className="text-fg-muted"
              />
            </div>

            {quota?.resetsAt ? (
              <div
                className={cn(
                  "flex items-center gap-2 text-[11px] text-fg-faint",
                  status === "stale" && "text-stale",
                )}
              >
                <span>Resets in</span>
                <Countdown resetsAt={quota.resetsAt} />
              </div>
            ) : null}
          </div>

          {quota ? (
            <QuotaRing
              used={quota.used}
              limit={quota.limit}
              size={96}
              label={`${displayName} ${quota.period} quota`}
              unit={quotaUnitLabel(quota.unit)}
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-border text-[10px] uppercase tracking-wide text-fg-faint"
              aria-label="No quota data"
            >
              no quota
            </div>
          )}
        </div>

        <ModelBreakdownTable rows={breakdown} open={expanded} />

        <CardFooter
          costUsd={session.costUsd}
          expanded={expanded}
          onToggle={onToggleExpand}
          hasBreakdown={breakdown.length > 0}
        />
      </div>
    </Card>
  );
}
