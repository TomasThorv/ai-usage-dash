"use client";

import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";
import { useUsageStore } from "@/lib/store/usage";
import { useEffect } from "react";

interface DashboardLiveBridgeProps {
  initial: UsageSnapshot[];
}

interface ServerError {
  providerId: ProviderId;
  kind?: string;
  message?: string;
}

function isUsageSnapshot(v: unknown): v is UsageSnapshot {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.providerId === "string" && typeof obj.fetchedAt === "string";
}

function isServerError(v: unknown): v is ServerError {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.providerId === "string";
}

export function DashboardLiveBridge({ initial }: DashboardLiveBridgeProps): null {
  const setSnapshot = useUsageStore((s) => s.setSnapshot);
  const setError = useUsageStore((s) => s.setError);

  // biome-ignore lint/correctness/useExhaustiveDependencies: hydrate once on mount only
  useEffect(() => {
    for (const s of initial) {
      setSnapshot(s);
    }
  }, []);

  // Subscribe to SSE
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource("/api/stream");

    const onSnapshot = (e: MessageEvent<string>): void => {
      try {
        const parsed: unknown = JSON.parse(e.data);
        if (isUsageSnapshot(parsed)) setSnapshot(parsed);
      } catch {
        // ignore malformed
      }
    };
    const onError = (e: MessageEvent<string>): void => {
      try {
        const parsed: unknown = JSON.parse(e.data);
        if (isServerError(parsed)) {
          setError(parsed.providerId, parsed.message ?? parsed.kind ?? "error");
        }
      } catch {
        // ignore
      }
    };

    es.addEventListener("snapshot", onSnapshot as EventListener);
    es.addEventListener("error", onError as EventListener);

    return () => {
      es.removeEventListener("snapshot", onSnapshot as EventListener);
      es.removeEventListener("error", onError as EventListener);
      es.close();
    };
  }, [setSnapshot, setError]);

  return null;
}
