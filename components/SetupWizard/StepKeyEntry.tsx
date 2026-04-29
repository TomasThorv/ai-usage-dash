"use client";

import { KeyHelpPanel } from "@/components/SetupWizard/KeyHelpPanel";
import { Button } from "@/components/ui/Button";
import type { AuthField, ProviderId } from "@/lib/providers/types";
import { cn } from "@/lib/utils/cn";
import { readCsrfToken } from "@/lib/utils/csrf";
import { CheckCircle2, ChevronDown, Loader2, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  authFields: AuthField[];
}

interface StepKeyEntryProps {
  selected: ProviderId[];
  onVerified: (ids: ProviderId[]) => void;
  onBack: () => void;
  onNext: () => void;
}

type RowState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "verifying" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

export function StepKeyEntry({
  selected,
  onVerified,
  onBack,
  onNext,
}: StepKeyEntryProps): ReactNode {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [open, setOpen] = useState<ProviderId | null>(null);
  const [creds, setCreds] = useState<Record<string, Record<string, string>>>({});
  const [states, setStates] = useState<Record<string, RowState>>({});

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: { providers: ProviderMeta[] }) => {
        const filtered = data.providers.filter((p) => selected.includes(p.id));
        setProviders(filtered);
        setOpen(filtered[0]?.id ?? null);
      })
      .catch(() => {
        // tolerate fetch failure — UI still renders selected ids
      });
  }, [selected]);

  const setField = (id: ProviderId, key: string, value: string): void => {
    setCreds((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));
  };

  const verify = async (id: ProviderId): Promise<void> => {
    const token = readCsrfToken();
    setStates((s) => ({ ...s, [id]: { kind: "saving" } }));
    try {
      const saveRes = await fetch("/api/credentials", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify({ providerId: id, creds: creds[id] ?? {} }),
      });
      if (!saveRes.ok) {
        const data = (await saveRes.json().catch(() => ({}))) as { error?: string };
        setStates((s) => ({
          ...s,
          [id]: { kind: "error", message: data.error ?? `save failed (${saveRes.status})` },
        }));
        return;
      }
      setStates((s) => ({ ...s, [id]: { kind: "verifying" } }));
      const verRes = await fetch(`/api/credentials/${id}/verify`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify({ creds: creds[id] ?? {} }),
      });
      if (!verRes.ok) {
        const data = (await verRes.json().catch(() => ({}))) as { error?: string };
        setStates((s) => ({
          ...s,
          [id]: { kind: "error", message: data.error ?? `verify failed (${verRes.status})` },
        }));
        return;
      }
      setStates((s) => ({ ...s, [id]: { kind: "ok" } }));
    } catch (err) {
      setStates((s) => ({
        ...s,
        [id]: {
          kind: "error",
          message: err instanceof Error ? err.message : "network error",
        },
      }));
    }
  };

  const verifiedIds = providers.filter((p) => states[p.id]?.kind === "ok").map((p) => p.id);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium text-fg">Enter API keys</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Keys are encrypted at rest with libsodium sealed-boxes. Verify each before continuing.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          {providers.map((p) => {
            const state = states[p.id] ?? { kind: "idle" };
            const isOpen = open === p.id;
            return (
              <div
                key={p.id}
                className={cn(
                  "overflow-hidden rounded-card border bg-surface",
                  state.kind === "ok"
                    ? "border-ok/40"
                    : state.kind === "error"
                      ? "border-error/40"
                      : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <div className="flex items-center gap-2">
                    {state.kind === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden="true" />
                    ) : state.kind === "error" ? (
                      <XCircle className="h-4 w-4 text-error" aria-hidden="true" />
                    ) : state.kind === "verifying" || state.kind === "saving" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-fg-muted" aria-hidden="true" />
                    ) : (
                      <span className="block h-2 w-2 rounded-full bg-fg-faint" />
                    )}
                    <span className="text-sm font-medium text-fg">{p.displayName}</span>
                  </div>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 text-fg-muted transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen ? (
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    {p.authFields.map((f) => (
                      <label key={f.key} className="block text-xs">
                        <span className="text-fg-muted">{f.label}</span>
                        <input
                          type={f.secret ? "password" : "text"}
                          placeholder={f.placeholder}
                          value={creds[p.id]?.[f.key] ?? ""}
                          onChange={(e) => setField(p.id, f.key, e.target.value)}
                          className="mt-1 block w-full rounded-md border border-border bg-bg/60 px-2.5 py-1.5 font-mono text-xs text-fg outline-none placeholder:text-fg-faint focus:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent"
                        />
                      </label>
                    ))}
                    {state.kind === "error" ? (
                      <p className="text-xs text-error">{state.message}</p>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant={state.kind === "ok" ? "ghost" : "primary"}
                        onClick={() => verify(p.id)}
                        disabled={state.kind === "saving" || state.kind === "verifying"}
                      >
                        {state.kind === "saving"
                          ? "Saving…"
                          : state.kind === "verifying"
                            ? "Verifying…"
                            : state.kind === "ok"
                              ? "Re-verify"
                              : "Verify"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div>{open ? <KeyHelpPanel providerId={open} /> : null}</div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          onClick={() => {
            onVerified(verifiedIds);
            onNext();
          }}
          disabled={verifiedIds.length === 0}
        >
          Continue ({verifiedIds.length} verified)
        </Button>
      </div>
    </div>
  );
}
