import type { ProviderId } from "@/lib/providers/types";

const POLL_INTERVAL_MS: Record<ProviderId, number> = {
  claude: 60_000,
  openai: 60_000,
  cursor: 60_000,
  opencode: 5_000,
  gemini: 60_000,
  copilot: 300_000,
};

export function pollIntervalMs(id: ProviderId): number {
  const v = POLL_INTERVAL_MS[id];
  return v;
}

export function staleMs(id: ProviderId): number {
  return pollIntervalMs(id) * 2;
}
