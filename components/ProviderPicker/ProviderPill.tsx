"use client";

import type { ProviderId } from "@/lib/providers/types";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface ProviderPillProps {
  providerId: ProviderId;
  label: string;
  visible: boolean;
  connected: boolean;
  onToggle: () => void;
}

export function ProviderPill({
  providerId,
  label,
  visible,
  connected,
  onToggle,
}: ProviderPillProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      data-provider={providerId}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors",
        visible
          ? "border-accent/40 bg-accent/10 text-fg"
          : "border-border bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("block h-1.5 w-1.5 rounded-full", connected ? "bg-accent" : "bg-fg-faint")}
      />
      <span>{label}</span>
    </button>
  );
}
