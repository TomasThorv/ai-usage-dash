"use client";

import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "@/lib/utils/reducedMotion";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface CountUpProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  mono?: boolean;
  className?: string;
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function CountUp({
  value,
  duration = 400,
  format,
  mono = false,
  className,
}: CountUpProps): ReactNode {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const fromRef = useRef<number>(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = value;
    const start = fromRef.current;
    // Visual-regression mode: snap to final value to keep screenshots deterministic.
    const visualMode =
      typeof window !== "undefined" &&
      (window as unknown as { __visualMode?: boolean }).__visualMode === true;
    if (reduced || visualMode || start === target) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    const tick = (now: number): void => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOut(progress);
      const current = start + (target - start) * eased;
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== 0) window.cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduced]);

  const text = format ? format(display) : Math.round(display).toLocaleString();
  return <span className={cn(mono && "font-mono tabular-nums", className)}>{text}</span>;
}
