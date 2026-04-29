"use client";

import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full",
        "border border-border-faint bg-surface-glass text-text-muted hover:bg-surface-glass-strong hover:text-text-primary",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deeper",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
