"use client";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import type { ProviderId } from "@/lib/providers/types";
import { readCsrfToken } from "@/lib/utils/csrf";
import { Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

interface CredentialRow {
  providerId: ProviderId;
  lastVerifiedAt: number | null;
}

export function KeyManager(): ReactNode {
  const [rows, setRows] = useState<CredentialRow[]>([]);

  const refresh = (): void => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data: { credentials: CredentialRow[] }) => setRows(data.credentials))
      .catch(() => setRows([]));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only fetch
  useEffect(() => {
    refresh();
  }, []);

  const remove = async (id: ProviderId): Promise<void> => {
    const token = readCsrfToken();
    await fetch("/api/credentials", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify({ providerId: id }),
    });
    refresh();
  };

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">API Keys</h3>
        <Button size="sm" variant="ghost" onClick={refresh}>
          Refresh
        </Button>
      </header>
      {rows.length === 0 ? (
        <p className="text-xs text-fg-muted">No credentials saved.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.providerId}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium capitalize text-fg">{r.providerId}</p>
                <p className="font-mono text-[10px] text-fg-faint">••••••••••••••••</p>
              </div>
              <IconButton
                label={`Delete ${r.providerId} credentials`}
                onClick={() => remove(r.providerId)}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
