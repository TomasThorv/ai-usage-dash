import type { ReactNode } from "react";

export function Vignette(): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(0,0,0,0.35) 100%)",
      }}
    />
  );
}
