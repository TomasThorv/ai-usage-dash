"use client";

import { CountUp } from "@/components/CountUp/CountUp";
import { cn } from "@/lib/utils/cn";
import { formatUsd } from "@/lib/utils/format";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface CardFooterProps {
  costUsd: number;
  expanded: boolean;
  onToggle: () => void;
  hasBreakdown?: boolean;
}

export function CardFooter({
  costUsd,
  expanded,
  onToggle,
  hasBreakdown = true,
}: CardFooterProps): ReactNode {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border-faint pt-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] uppercase tracking-wide text-text-faint">Cost</span>
        <CountUp
          value={costUsd}
          mono
          format={formatUsd}
          className="text-base font-semibold text-text-primary"
        />
      </div>
      {hasBreakdown ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse breakdown" : "Expand breakdown"}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-text-muted",
            "hover:bg-surface-glass-strong hover:text-text-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deeper",
          )}
        >
          <span>{expanded ? "Hide" : "Models"}</span>
          <ChevronDown
            aria-hidden="true"
            className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      ) : null}
    </div>
  );
}
