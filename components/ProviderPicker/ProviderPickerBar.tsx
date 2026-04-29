"use client";

import { ProviderPill } from "@/components/ProviderPicker/ProviderPill";
import type { ProviderId } from "@/lib/providers/types";
import { useUiStore } from "@/lib/store/ui";
import type { ReactNode } from "react";

interface PickerProvider {
  id: ProviderId;
  displayName: string;
  connected: boolean;
}

interface ProviderPickerBarProps {
  providers: PickerProvider[];
}

export function ProviderPickerBar({ providers }: ProviderPickerBarProps): ReactNode {
  const visible = useUiStore((s) => s.visibleProviders);
  const toggle = useUiStore((s) => s.toggleVisible);

  if (providers.length === 0) return null;

  return (
    <div className="hidden items-center gap-1.5 lg:flex">
      {providers.map((p) => (
        <ProviderPill
          key={p.id}
          providerId={p.id}
          label={p.displayName}
          visible={visible.includes(p.id)}
          connected={p.connected}
          onToggle={() => toggle(p.id)}
        />
      ))}
    </div>
  );
}
