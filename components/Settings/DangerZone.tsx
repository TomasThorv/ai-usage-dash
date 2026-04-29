"use client";

import { Button } from "@/components/ui/Button";
import { readCsrfToken } from "@/lib/utils/csrf";
import { type ReactNode, useState } from "react";

const CONFIRM_PHRASE = "WIPE";

export function DangerZone(): ReactNode {
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const wipe = async (): Promise<void> => {
    if (text !== CONFIRM_PHRASE) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = readCsrfToken();
      const res = await fetch("/api/credentials", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify({ all: true }),
      });
      setMsg(res.ok ? "Wiped." : `Failed (${res.status})`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-error/30 p-3">
      <h3 className="text-sm font-semibold text-error">Danger zone</h3>
      <p className="text-xs text-fg-muted">
        Type <code className="rounded bg-bg px-1 font-mono">{CONFIRM_PHRASE}</code> to enable.
      </p>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="block w-full rounded-md border border-border bg-bg/60 px-2.5 py-1.5 font-mono text-xs text-fg outline-none focus:border-error focus-visible:ring-2 focus-visible:ring-error"
      />
      <Button variant="danger" size="sm" disabled={busy || text !== CONFIRM_PHRASE} onClick={wipe}>
        {busy ? "Wiping…" : "Delete all credentials"}
      </Button>
      {msg ? <p className="text-xs text-fg-muted">{msg}</p> : null}
    </section>
  );
}
