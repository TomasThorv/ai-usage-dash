import claude from "@/lib/providers/claude";
import copilot from "@/lib/providers/copilot";
import cursor from "@/lib/providers/cursor";
import gemini from "@/lib/providers/gemini";
import openai from "@/lib/providers/openai";
import opencode from "@/lib/providers/opencode";
import type { ProviderAdapter, ProviderId } from "@/lib/providers/types";

const adapters = [claude, openai, cursor, opencode, gemini, copilot] as const;

export const registry: ReadonlyMap<ProviderId, ProviderAdapter> = new Map(
  adapters.map((a) => [a.id, a]),
);

export function getAdapter(id: ProviderId): ProviderAdapter {
  const a = registry.get(id);
  if (!a) throw new Error(`unknown provider ${id}`);
  return a;
}

export function listAdapters(): ProviderAdapter[] {
  return Array.from(registry.values());
}
