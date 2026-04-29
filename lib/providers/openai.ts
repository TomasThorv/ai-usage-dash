import { pollIntervalMs } from "@/lib/config/budgets";
import { jsonFetch, startOfTodayUtcUnixSec } from "@/lib/providers/_http";
import type {
  ProviderAdapter,
  UsageSnapshot,
  UsageSnapshotModelEntry,
} from "@/lib/providers/types";

const PROVIDER_ID = "openai" as const;
const OPENAI_BASE = "https://api.openai.com";

interface UsageCompletionResult {
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
  num_model_requests?: number;
}

interface UsageBucket {
  results?: UsageCompletionResult[];
}

interface UsageResponse {
  data?: UsageBucket[];
}

interface CostResult {
  amount?: { value?: number; currency?: string };
  line_item?: string;
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
    Authorization: `Bearer ${apiKey}`,
    accept: "application/json",
  };
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "OpenAI",
  iconSlug: "openai",
  status: "official",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "adminKey",
      label: "Admin API Key",
      type: "apiKey",
      secret: true,
      placeholder: "sk-admin-...",
      helpUrl: "https://platform.openai.com/settings/organization/admin-keys",
    },
  ],

  async verify(creds, signal) {
    const headers = buildHeaders(creds);
    const startTime = startOfTodayUtcUnixSec();
    const url = `${OPENAI_BASE}/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1d&limit=1`;
    await jsonFetch<UsageResponse>({
      providerId: PROVIDER_ID,
      url,
      headers,
      signal,
    });
  },

  async fetchUsage(creds, signal): Promise<UsageSnapshot> {
    const headers = buildHeaders(creds);
    const startTime = startOfTodayUtcUnixSec();
    const usageUrl = `${OPENAI_BASE}/v1/organization/usage/completions?start_time=${startTime}&bucket_width=1d&group_by[]=model`;
    const costUrl = `${OPENAI_BASE}/v1/organization/costs?start_time=${startTime}&bucket_width=1d`;

    const [usage, cost] = await Promise.all([
      jsonFetch<UsageResponse>({ providerId: PROVIDER_ID, url: usageUrl, headers, signal }),
      jsonFetch<CostResponse>({ providerId: PROVIDER_ID, url: costUrl, headers, signal }),
    ]);

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let requests = 0;
    const perModel = new Map<string, UsageSnapshotModelEntry>();

    for (const bucket of usage.data ?? []) {
      for (const r of bucket.results ?? []) {
        const inp = num(r.input_tokens);
        const outp = num(r.output_tokens);
        const cached = num(r.input_cached_tokens);
        const reqs = num(r.num_model_requests);
        inputTokens += inp;
        outputTokens += outp;
        cacheReadTokens += cached;
        requests += reqs;
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
          requests: prev.requests + reqs,
          costUsd: prev.costUsd,
        });
      }
    }

    let costUsd = 0;
    for (const bucket of cost.data ?? []) {
      for (const r of bucket.results ?? []) {
        const v = r.amount?.value;
        if (typeof v === "number" && Number.isFinite(v)) costUsd += v;
      }
    }

    const session = {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      requests,
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

export default adapter;
