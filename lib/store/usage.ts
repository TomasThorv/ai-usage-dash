"use client";

import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";
import { create } from "zustand";

type SnapshotMap = Record<ProviderId, UsageSnapshot | null>;
type ErrorMap = Record<ProviderId, string | null>;

const PROVIDERS: ProviderId[] = ["claude", "openai", "cursor", "opencode", "gemini", "copilot"];

function emptySnapshots(): SnapshotMap {
  const out = {} as SnapshotMap;
  for (const id of PROVIDERS) out[id] = null;
  return out;
}

function emptyErrors(): ErrorMap {
  const out = {} as ErrorMap;
  for (const id of PROVIDERS) out[id] = null;
  return out;
}

interface UsageStore {
  snapshots: SnapshotMap;
  errors: ErrorMap;
  setSnapshot: (s: UsageSnapshot) => void;
  setError: (id: ProviderId, message: string | null) => void;
}

export const useUsageStore = create<UsageStore>((set) => ({
  snapshots: emptySnapshots(),
  errors: emptyErrors(),
  setSnapshot: (s) =>
    set((state) => ({
      snapshots: { ...state.snapshots, [s.providerId]: s },
      errors: { ...state.errors, [s.providerId]: null },
    })),
  setError: (id, message) => set((state) => ({ errors: { ...state.errors, [id]: message } })),
}));
