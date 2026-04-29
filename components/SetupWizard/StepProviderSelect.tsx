"use client";

import { Button } from "@/components/ui/Button";
import type { ProviderId } from "@/lib/providers/types";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

interface ProviderOption {
  id: ProviderId;
  displayName: string;
  status: "official" | "unofficial";
}

interface StepProviderSelectProps {
  selected: ProviderId[];
  onSelect: (ids: ProviderId[]) => void;
  onNext: () => void;
}

export function StepProviderSelect({
  selected,
  onSelect,
  onNext,
}: StepProviderSelectProps): ReactNode {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { providers: ProviderOption[] }) => {
        if (cancelled) return;
        setProviders(data.providers);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "failed to load");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: ProviderId): void => {
    onSelect(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-fg">Pick providers</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Choose any combination — you can add more later.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-fg-muted">Loading providers…</p>
      ) : error ? (
        <p className="text-sm text-error">Could not load providers: {error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {providers.map((p) => {
            const isSel = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
                  isSel
                    ? "border-accent/50 bg-accent/10"
                    : "border-border bg-surface hover:bg-surface-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                )}
              >
                <div>
                  <p className="text-sm font-medium text-fg">{p.displayName}</p>
                  <p className="text-[11px] text-fg-faint capitalize">{p.status}</p>
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border",
                    isSel
                      ? "border-accent bg-accent text-bg"
                      : "border-border",
                  )}
                >
                  {isSel ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={selected.length === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
