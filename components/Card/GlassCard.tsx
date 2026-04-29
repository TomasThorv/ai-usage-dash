"use client";

import { cn } from "@/lib/utils/cn";
import { usePrefersReducedMotion } from "@/lib/utils/reducedMotion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  as?: "div" | "section" | "article";
}

const BASE =
  "relative w-full rounded-card bg-surface border border-border overflow-hidden";

const SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_40px_-8px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.4)]";

export function GlassCard({
  children,
  className,
  glow = false,
  interactive = false,
}: GlassCardProps): ReactNode {
  const reduced = usePrefersReducedMotion();
  const classes = cn(
    BASE,
    SHADOW,
    "backdrop-blur-[20px]",
    glow && "shadow-[0_0_40px_rgba(94,234,212,0.15),0_0_40px_rgba(167,139,250,0.18)]",
    className,
  );

  if (interactive && !reduced) {
    return (
      <motion.div
        className={cn(classes, "cursor-default")}
        whileHover={{
          y: -4,
          boxShadow:
            "0 18px 48px -10px rgba(0,0,0,0.6), 0 0 36px rgba(94,234,212,0.18), 0 0 36px rgba(167,139,250,0.16)",
        }}
        transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={classes}>{children}</div>;
}
