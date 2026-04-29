"use client";

import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "@/lib/utils/reducedMotion";
import { motion } from "framer-motion";
import { type ReactNode, useId } from "react";

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

function colorFor(pct: number): string {
  if (pct > 0.85) return "var(--color-status-error)";
  if (pct > 0.6) return "var(--color-status-warn)";
  return "var(--color-status-ok)";
}

export function QuotaRing({
  used,
  limit,
  size = 96,
  stroke = 6,
  label,
  unit,
}: QuotaRingProps): ReactNode {
  const reduced = usePrefersReducedMotion();
  const gradId = useId();
  const safeLimit = limit > 0 ? limit : 1;
  const pct = Math.max(0, Math.min(1, used / safeLimit));
  const color = colorFor(pct);
  const offset = CIRC * (1 - pct);
  const pulse = pct > 0.95 && !reduced;
  const valueText = `${Math.round(pct * 100)}%`;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", pulse && "animate-pulse")}
      style={{ width: size, height: size }}
      role="progressbar"
      tabIndex={0}
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Quota usage"}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-cyan)" />
            <stop offset="100%" stopColor="var(--color-accent-violet)" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: reduced ? offset : offset }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.42, 0, 0.58, 1] }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-base font-semibold tabular-nums text-text-primary">
          {valueText}
        </span>
        {unit ? (
          <span className="text-[10px] uppercase tracking-wide text-text-faint">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
