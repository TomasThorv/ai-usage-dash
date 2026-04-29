"use client";

import { cn } from "@/lib/utils/cn";
import { type ReactNode, useEffect, useState } from "react";

interface CountdownProps {
  resetsAt: string;
  onReached?: () => void;
  className?: string;
  prefix?: string;
}

function diffSec(target: number): number {
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

function format(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Countdown({ resetsAt, onReached, className, prefix }: CountdownProps): ReactNode {
  const target = Date.parse(resetsAt);
  const valid = !Number.isNaN(target);
  const [seconds, setSeconds] = useState<number>(() => (valid ? diffSec(target) : 0));

  // biome-ignore lint/correctness/useExhaustiveDependencies: target derived from resetsAt; firing once per resetsAt change
  useEffect(() => {
    if (!valid) return;
    setSeconds(diffSec(target));
    // Visual-regression mode: do not start the ticker so the screenshot is stable.
    const visualMode = (window as unknown as { __visualMode?: boolean }).__visualMode === true;
    if (visualMode) return;
    let fired = false;
    const id = window.setInterval(() => {
      const remaining = diffSec(target);
      setSeconds(remaining);
      if (remaining === 0 && !fired) {
        fired = true;
        if (onReached) onReached();
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [resetsAt, valid]);

  if (!valid) {
    return <span className={cn("font-mono tabular-nums text-text-faint", className)}>—</span>;
  }

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {prefix ? <span className="mr-1 text-text-faint">{prefix}</span> : null}
      {format(seconds)}
    </span>
  );
}
