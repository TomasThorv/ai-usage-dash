import type { ReactNode } from "react";

export function GradientBackdrop(): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-20 bg-gradient-to-b from-bg-deep to-bg-deeper"
    />
  );
}
