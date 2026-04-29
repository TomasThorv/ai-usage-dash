import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "section" | "article";
}

export function Card({
  children,
  className,
  interactive = false,
}: CardProps): ReactNode {
  return (
    <div
      className={cn(
        "relative w-full rounded-card bg-surface border border-border",
        interactive && "transition-[border-color] duration-[120ms] hover:border-border-strong",
        className,
      )}
    >
      {children}
    </div>
  );
}
