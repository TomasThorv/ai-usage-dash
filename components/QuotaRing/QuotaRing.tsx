"use client";

import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface QuotaRingProps {
  used: number;
  limit: number;
  size?: number;
  stroke?: number;
  label?: string;
  unit?: string;
}

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

export function QuotaRing({
  used,
  limit,
  size = 96,
  stroke = 6,
  label,
  unit,
}: QuotaRingProps): ReactNode {
  const safeLimit = limit > 0 ? limit : 1;
  const pct = Math.max(0, Math.min(1, used / safeLimit));
  const offset = CIRC * (1 - pct);
  const valueText = `${Math.round(pct * 100)}%`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      tabIndex={0}
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Quota usage"}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="var(--color-fg)"
          strokeOpacity="0.7"
          strokeWidth={stroke}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: [0.42, 0, 0.58, 1] }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-base font-semibold tabular-nums text-fg">
          {valueText}
        </span>
        {unit ? (
          <span className="text-[10px] uppercase tracking-wide text-fg-faint">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
