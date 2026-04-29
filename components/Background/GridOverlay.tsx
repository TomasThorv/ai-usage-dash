"use client";

import { usePrefersReducedMotion } from "@/lib/utils/reducedMotion";
import { type ReactNode, useEffect, useRef } from "react";

const MAX_TRANSLATE = 20;

export function GridOverlay(): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      const el = ref.current;
      if (el) el.style.transform = "translate3d(0,0,0)";
      return;
    }
    let raf = 0;
    let pendingX = 0;
    let pendingY = 0;
    const handleMove = (e: MouseEvent): void => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      pendingX = ((e.clientX / w) * 2 - 1) * MAX_TRANSLATE;
      pendingY = ((e.clientY / h) * 2 - 1) * MAX_TRANSLATE;
      if (raf === 0) {
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          const el = ref.current;
          if (el) el.style.transform = `translate3d(${pendingX}px, ${pendingY}px, 0)`;
        });
      }
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div
      aria-hidden="true"
      ref={ref}
      className="pointer-events-none fixed inset-0 -z-10 will-change-transform"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(99,179,237,0.08) 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, rgba(99,179,237,0.08) 0 1px, transparent 1px 32px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
      }}
    />
  );
}
