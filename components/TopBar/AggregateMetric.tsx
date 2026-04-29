"use client";

import { CountUp } from "@/components/CountUp/CountUp";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface AggregateMetricProps {
  label: string;
  value: number;
  format?: (n: number) => string;
  mono?: boolean;
}

export function AggregateMetric({
  label,
  value,
  format,
  mono = true,
}: AggregateMetricProps): ReactNode {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-text-faint">{label}</span>
      <CountUp
        value={value}
        {...(format ? { format } : {})}
        mono={mono}
        className={cn("text-sm font-semibold text-text-primary")}
      />
    </div>
  );
}
