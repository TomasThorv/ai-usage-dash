"use client";

import { DangerZone } from "@/components/Settings/DangerZone";
import { KeyManager } from "@/components/Settings/KeyManager";
import { PollingControl } from "@/components/Settings/PollingControl";
import { ThemeToggle } from "@/components/Settings/ThemeToggle";
import { IconButton } from "@/components/ui/IconButton";
import type { ProviderId } from "@/lib/providers/types";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  pollIntervalMs: number;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps): ReactNode {
  const [providers, setProviders] = useState<ProviderMeta[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data: { providers: ProviderMeta[] }) => setProviders(data.providers))
      .catch(() => setProviders([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            // biome-ignore lint/a11y/useSemanticElements: motion.aside used for slide animation; native <dialog> not animatable in framer the same way
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border-faint bg-bg-deeper/95 backdrop-blur-[24px]"
          >
            <header className="flex items-center justify-between border-b border-border-faint px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
              <IconButton label="Close settings" onClick={onClose}>
                <X aria-hidden="true" className="h-4 w-4" />
              </IconButton>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <KeyManager />
              <PollingControl
                providers={providers.map((p) => ({
                  id: p.id,
                  displayName: p.displayName,
                  defaultIntervalMs: p.pollIntervalMs,
                }))}
              />
              <ThemeToggle />
              <DangerZone />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
