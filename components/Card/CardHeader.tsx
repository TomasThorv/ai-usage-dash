"use client";

import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/format";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type CardStatus = "fresh" | "stale" | "error" | "loading";

interface CardHeaderProps {
  logo?: ReactNode;
  name: string;
  status: CardStatus;
  lastUpdatedMs?: number | null;
  iconSlug?: string;
}

const STATUS_META: Record<
  CardStatus,
  {
    label: string;
    dot: string;
    pulse: boolean;
    Icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  fresh: {
    label: "Live",
    dot: "bg-accent",
    pulse: true,
    Icon: CheckCircle2,
    iconClass: "text-accent",
  },
  stale: {
    label: "Stale",
    dot: "bg-stale",
    pulse: false,
    Icon: Clock,
    iconClass: "text-stale",
  },
  error: {
    label: "Error",
    dot: "bg-error",
    pulse: false,
    Icon: AlertTriangle,
    iconClass: "text-error",
  },
  loading: {
    label: "Loading",
    dot: "bg-fg-faint",
    pulse: false,
    Icon: Loader2,
    iconClass: "text-fg-muted animate-spin",
  },
};

function ProviderInitial({ name }: { name: string }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-fg"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function CardHeader({ logo, name, status, lastUpdatedMs }: CardHeaderProps): ReactNode {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  const iso = typeof lastUpdatedMs === "number" ? new Date(lastUpdatedMs).toISOString() : undefined;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {logo ?? <ProviderInitial name={name} />}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{name}</h3>
          <p className="text-[11px] text-fg-faint">{formatRelative(iso)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="relative inline-flex">
          <span className={cn("block h-2 w-2 rounded-full", meta.dot)} />
          {meta.pulse ? (
            <span
              aria-hidden="true"
              className={cn("absolute inset-0 h-2 w-2 rounded-full animate-ping", meta.dot)}
            />
          ) : null}
        </span>
        <Icon aria-hidden="true" className={cn("h-3.5 w-3.5", meta.iconClass)} />
        <span className="sr-only">{meta.label}</span>
      </div>
    </div>
  );
}
