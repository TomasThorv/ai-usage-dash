"use client";

import type { ReactNode } from "react";

interface AggregateMetricProps {
  label: string;
  value: number;
  format?: (n: number) => string;
}

export function AggregateMetric({ label, value, format }: AggregateMetricProps): ReactNode {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-fg-faint">{label}</span>
      <span className="font-mono tabular-nums text-sm font-semibold text-fg">
        {format ? format(value) : Math.round(value).toLocaleString()}
      </span>
    </div>
  );
}
