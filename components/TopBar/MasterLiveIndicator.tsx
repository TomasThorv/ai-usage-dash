"use client";

import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export type MasterStatus = "live" | "partial" | "stale";

interface MasterLiveIndicatorProps {
  status: MasterStatus;
}

const META: Record<MasterStatus, { label: string; dot: string; pulse: boolean }> = {
  live: { label: "Live", dot: "bg-accent", pulse: true },
  partial: { label: "Partial", dot: "bg-warn", pulse: false },
  stale: { label: "Stale", dot: "bg-stale", pulse: false },
};

export function MasterLiveIndicator({ status }: MasterLiveIndicatorProps): ReactNode {
  const meta = META[status];
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-fg-muted">
      <span className="relative inline-flex">
        <span className={cn("block h-2 w-2 rounded-full", meta.dot)} />
        {meta.pulse ? (
          <span
            aria-hidden="true"
            className={cn("absolute inset-0 h-2 w-2 rounded-full animate-ping", meta.dot)}
          />
        ) : null}
      </span>
      <span>{meta.label}</span>
    </div>
  );
}
