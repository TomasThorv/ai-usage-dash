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
          ? "border-accent-cyan/40 bg-accent-cyan/10 text-text-primary"
          : "border-border-faint bg-surface-glass text-text-muted hover:bg-surface-glass-strong hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deeper",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block h-1.5 w-1.5 rounded-full",
          connected ? "bg-accent-cyan" : "bg-text-faint",
        )}
      />
      <span>{label}</span>
    </button>
  );
}
