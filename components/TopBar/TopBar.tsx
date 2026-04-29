"use client";

import { ProviderPickerBar } from "@/components/ProviderPicker/ProviderPickerBar";
import { AggregateMetric } from "@/components/TopBar/AggregateMetric";
import { MasterLiveIndicator, type MasterStatus } from "@/components/TopBar/MasterLiveIndicator";
import { IconButton } from "@/components/ui/IconButton";
import type { ProviderId } from "@/lib/providers/types";
import { formatInteger, formatUsd } from "@/lib/utils/format";
import { Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface PickerProvider {
  id: ProviderId;
  displayName: string;
  connected: boolean;
}

interface TopBarProps {
  totalTokensToday: number;
  totalSpendToday: number;
  activeProviders: number;
  masterStatus: MasterStatus;
  providers: PickerProvider[];
}

export function TopBar({
  totalTokensToday,
  totalSpendToday,
  activeProviders,
  masterStatus,
  providers,
}: TopBarProps): ReactNode {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-border bg-bg">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span className="font-mono text-sm font-semibold tracking-tight text-fg sm:block">
            AI Usage
          </span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <AggregateMetric label="Tokens" value={totalTokensToday} format={formatInteger} />
          <AggregateMetric label="Spend" value={totalSpendToday} format={formatUsd} />
          <AggregateMetric
            label="Providers"
            value={activeProviders}
            format={(n) => `${Math.round(n)}`}
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ProviderPickerBar providers={providers} />
          <MasterLiveIndicator status={masterStatus} />
          <Link href="/settings" aria-label="Settings">
            <IconButton label="Settings">
              <SettingsIcon aria-hidden="true" className="h-4 w-4" />
            </IconButton>
          </Link>
        </div>
      </div>
    </header>
  );
}
