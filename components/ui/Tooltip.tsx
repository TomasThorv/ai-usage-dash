import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

/**
 * Lightweight v1 tooltip — uses native title attribute. Wraps inline.
 * Replace later with a hover-card primitive if needed.
 */
export function Tooltip({ label, children }: TooltipProps): ReactNode {
  return (
    <span title={label} className="inline-flex">
      {children}
    </span>
  );
}
