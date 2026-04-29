"use client";

import type { ProviderId } from "@/lib/providers/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "dim" | "light";

const ALL_PROVIDERS: ProviderId[] = ["claude", "openai", "cursor", "opencode", "gemini", "copilot"];

interface UiStore {
  cardOrder: ProviderId[];
  visibleProviders: ProviderId[];
  theme: Theme;
  setCardOrder: (order: ProviderId[]) => void;
  setVisible: (visible: ProviderId[]) => void;
  toggleVisible: (id: ProviderId) => void;
  setTheme: (theme: Theme) => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      cardOrder: [...ALL_PROVIDERS],
      visibleProviders: [...ALL_PROVIDERS],
      theme: "dark",
      setCardOrder: (order) => set({ cardOrder: order }),
      setVisible: (visible) => set({ visibleProviders: visible }),
      toggleVisible: (id) => {
        const current = get().visibleProviders;
        const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
        set({ visibleProviders: next });
      },
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "ai-usage-ui",
      version: 1,
    },
  ),
);
