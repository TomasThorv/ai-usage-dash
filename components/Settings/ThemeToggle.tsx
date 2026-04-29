"use client";

import { type Theme, useUiStore } from "@/lib/store/ui";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

const THEMES: Theme[] = ["dark", "dim", "light"];

export function ThemeToggle(): ReactNode {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Theme</h3>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="inline-flex rounded-full border border-border-faint bg-surface-glass p-0.5"
      >
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            // biome-ignore lint/a11y/useSemanticElements: segmented control needs button styling
            role="radio"
            aria-checked={theme === t}
            onClick={() => setTheme(t)}
            className={cn(
              "rounded-full px-3 py-1 text-xs capitalize transition-colors",
              theme === t
                ? "bg-gradient-to-r from-accent-cyan/30 to-accent-violet/30 text-text-primary"
                : "text-text-muted hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deeper",
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </section>
  );
}
