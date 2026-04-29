import { pollIntervalMs } from "@/lib/config/budgets";
import { ProviderHttpError, jsonFetch, startOfTodayUtcIso } from "@/lib/providers/_http";
import type {
  ProviderAdapter,
  UsageSnapshot,
  UsageSnapshotModelEntry,
} from "@/lib/providers/types";

const PROVIDER_ID = "claude" as const;
const ANTHROPIC_BASE = "https://api.anthropic.com";

interface UsageResult {
  model?: string;
  uncached_input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  };
}

interface UsageBucket {
  results?: UsageResult[];
}

interface UsageResponse {
  data?: UsageBucket[];
}

interface CostResult {
  amount?: string;
  currency?: string;
  description?: string;
}

interface CostBucket {
  results?: CostResult[];
}

interface CostResponse {
  data?: CostBucket[];
}

function buildHeaders(creds: Record<string, string>): Record<string, string> {
  const apiKey = (creds.adminKey ?? creds.apiKey ?? "").trim();
  if (!apiKey) throw new Error(`[${PROVIDER_ID}] missing admin API key`);
  return {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    accept: "application/json",
  };
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "Claude (Anthropic)",
  iconSlug: "anthropic",
  status: "official",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "adminKey",
      label: "Admin API Key",
      type: "apiKey",
      secret: true,
      placeholder: "sk-ant-admin01-...",
      helpUrl: "https://console.anthropic.com/settings/admin-keys",
    },
  ],

  async verify(creds, signal) {
    const headers = buildHeaders(creds);
    const startingAt = startOfTodayUtcIso();
    const url = `${ANTHROPIC_BASE}/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(startingAt)}&bucket_width=1d&limit=1`;
    await jsonFetch<UsageResponse>({
      providerId: PROVIDER_ID,
      url,
      headers,
      signal,
    });
  },

  async fetchUsage(creds, signal): Promise<UsageSnapshot> {
    const headers = buildHeaders(creds);
    const startingAt = startOfTodayUtcIso();
    const usageUrl = `${ANTHROPIC_BASE}/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(startingAt)}&bucket_width=1d&group_by[]=model`;
    const costUrl = `${ANTHROPIC_BASE}/v1/organizations/cost_report?starting_at=${encodeURIComponent(startingAt)}&bucket_width=1d`;

    const [usage, cost] = await Promise.all([
      jsonFetch<UsageResponse>({ providerId: PROVIDER_ID, url: usageUrl, headers, signal }),
      jsonFetch<CostResponse>({ providerId: PROVIDER_ID, url: costUrl, headers, signal }),
    ]);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;
    const perModel = new Map<string, UsageSnapshotModelEntry>();

    for (const bucket of usage.data ?? []) {
      for (const r of bucket.results ?? []) {
        const inp = num(r.uncached_input_tokens);
        const outp = num(r.output_tokens);
        const cr = num(r.cache_read_input_tokens);
        const cw =
          num(r.cache_creation?.ephemeral_5m_input_tokens) +
          num(r.cache_creation?.ephemeral_1h_input_tokens);
        inputTokens += inp;
        outputTokens += outp;
        cacheReadTokens += cr;
        cacheWriteTokens += cw;
        const model = r.model ?? "unknown";
        const prev = perModel.get(model) ?? {
          model,
          inputTokens: 0,
          outputTokens: 0,
          requests: 0,
          costUsd: 0,
        };
        perModel.set(model, {
          model,
          inputTokens: prev.inputTokens + inp,
          outputTokens: prev.outputTokens + outp,
          requests: prev.requests,
          costUsd: prev.costUsd,
        });
      }
    }

    let costUsd = 0;
    for (const bucket of cost.data ?? []) {
      for (const r of bucket.results ?? []) {
        const cents = Number.parseFloat(r.amount ?? "0");
        if (Number.isFinite(cents)) costUsd += cents / 100;
      }
    }

    const session = {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      requests: 0,
      costUsd,
    };

    const modelBreakdown = Array.from(perModel.values()).sort(
      (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens),
    );

    return {
      providerId: PROVIDER_ID,
      fetchedAt: new Date().toISOString(),
      session,
      ...(modelBreakdown.length > 0 ? { modelBreakdown } : {}),
    };
  },
};

function num(v: number | undefined | null): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// Re-export only for tests/diagnostics; never echoed to users.
export const _classifyError = (e: unknown): string =>
  e instanceof ProviderHttpError ? `${e.status}` : "unknown";

export default adapter;
