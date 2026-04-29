"use client";

import type { ProviderId } from "@/lib/providers/types";
import { type ReactNode, useState } from "react";

interface PollingRow {
  id: ProviderId;
  displayName: string;
  defaultIntervalMs: number;
}

interface PollingControlProps {
  providers: PollingRow[];
}

export function PollingControl({ providers }: PollingControlProps): ReactNode {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    for (const p of providers) {
      out[p.id] = Math.round(p.defaultIntervalMs / 1000);
    }
    return out;
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-fg">Polling intervals</h3>
      <p className="text-xs text-fg-muted">
        Local-only. Stored client-side; takes effect on next refresh.
      </p>
      <ul className="space-y-3">
        {providers.map((p) => {
          const value = values[p.id] ?? Math.round(p.defaultIntervalMs / 1000);
          return (
            <li key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg">{p.displayName}</span>
                <span className="font-mono tabular-nums text-fg-muted">{value}s</span>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={value}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [p.id]: Number.parseInt(e.target.value, 10) }))
                }
                className="w-full accent-[var(--color-accent)]"
                aria-label={`${p.displayName} poll interval`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
