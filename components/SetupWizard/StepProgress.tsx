"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StepProgressProps {
  step: number; // 1-based
  total: number;
  labels: string[];
}

export function StepProgress({ step, total, labels }: StepProgressProps): ReactNode {
  const pct = Math.max(0, Math.min(1, step / total));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] uppercase tracking-wide text-fg-faint">
        {labels.map((label, i) => (
          <span key={label} className={i + 1 <= step ? "text-fg" : "text-fg-faint"}>
            {i + 1}. {label}
          </span>
        ))}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-accent"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
