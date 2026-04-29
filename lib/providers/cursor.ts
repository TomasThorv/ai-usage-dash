import { Buffer } from "node:buffer";
import { pollIntervalMs } from "@/lib/config/budgets";
import { jsonFetch, startOfTodayUtcMs } from "@/lib/providers/_http";
import type {
  ProviderAdapter,
  UsageSnapshot,
  UsageSnapshotModelEntry,
} from "@/lib/providers/types";

const PROVIDER_ID = "cursor" as const;
const CURSOR_API_BASE = "https://api.cursor.com";
const CURSOR_DASH_BASE = "https://cursor.com";
const UA = "Mozilla/5.0 (compatible; ai-usage-dash/0.1)";

interface ApiKeyTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalCents?: number;
}

interface ApiKeyEvent {
  timestamp?: string;
  model?: string;
  kindLabel?: string;
  tokenUsage?: ApiKeyTokenUsage;
}

interface ApiKeyEventsResponse {
  totalUsageEventsCount?: number;
  usageEvents?: ApiKeyEvent[];
}

interface ApiKeySpendMember {
  spendCents?: number;
  fastPremiumRequests?: number;
}

interface ApiKeySpendResponse {
  totalMembers?: number;
  subscriptionCycleStart?: number;
  teamMemberSpend?: ApiKeySpendMember[];
}

interface CookieUsageResponse {
  startOfMonth?: string;
  endOfMonth?: string;
  subscriptionCycleStart?: number;
  subscriptionCycleEnd?: number;
  usageBasedPricing?: {
    totalSpendCents?: number;
    hardLimitCents?: number;
  };
  fastPremiumRequests?: {
    numRequests?: number;
    maxRequestUsage?: number;
  };
}

function getMode(creds: Record<string, string>): "apiKey" | "cookie" {
  const m = (creds.mode ?? "").trim().toLowerCase();
  if (m === "apikey") return "apiKey";
  if (m === "cookie") return "cookie";
  if (creds.apiKey) return "apiKey";
  if (creds.cookie) return "cookie";
  throw new Error(`[${PROVIDER_ID}] mode is required (apiKey or cookie)`);
}

function basicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function num(v: number | undefined | null): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

async function fetchApiKey(
  creds: Record<string, string>,
  signal: AbortSignal,
): Promise<UsageSnapshot> {
  const apiKey = (creds.apiKey ?? "").trim();
  if (!apiKey) throw new Error(`[${PROVIDER_ID}] missing apiKey`);
  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(apiKey),
    "content-type": "application/json",
    accept: "application/json",
  };
  const startDate = startOfTodayUtcMs();
  const endDate = Date.now();
  const eventsBody = JSON.stringify({ startDate, endDate, page: 1, pageSize: 100 });

  const [events, spend] = await Promise.all([
    jsonFetch<ApiKeyEventsResponse>({
      providerId: PROVIDER_ID,
      url: `${CURSOR_API_BASE}/teams/filtered-usage-events`,
      method: "POST",
      headers,
      body: eventsBody,
      signal,
    }),
    jsonFetch<ApiKeySpendResponse>({
      providerId: PROVIDER_ID,
      url: `${CURSOR_API_BASE}/teams/spend`,
      method: "POST",
      headers,
      body: "{}",
      signal,
    }),
  ]);

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  let costUsd = 0;
  const perModel = new Map<string, UsageSnapshotModelEntry>();

  for (const ev of events.usageEvents ?? []) {
    const t = ev.tokenUsage ?? {};
    const inp = num(t.inputTokens);
    const outp = num(t.outputTokens);
    const cr = num(t.cacheReadTokens);
    const cw = num(t.cacheWriteTokens);
    const cents = num(t.totalCents);
    inputTokens += inp;
    outputTokens += outp;
    cacheReadTokens += cr;
    cacheWriteTokens += cw;
    costUsd += cents / 100;
    const model = ev.model ?? "unknown";
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
      requests: prev.requests + 1,
      costUsd: prev.costUsd + cents / 100,
    });
  }

  // Prefer team spend total when available (covers usage-based costs).
  if (spend.teamMemberSpend && spend.teamMemberSpend.length > 0) {
    const teamCents = spend.teamMemberSpend.reduce((acc, m) => acc + num(m.spendCents), 0);
    if (teamCents > 0) costUsd = teamCents / 100;
  }

  const requests = events.usageEvents?.length ?? 0;
  return {
    providerId: PROVIDER_ID,
    fetchedAt: new Date().toISOString(),
    session: {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      requests,
      costUsd,
    },
    ...(perModel.size > 0 ? { modelBreakdown: Array.from(perModel.values()) } : {}),
  };
}

async function fetchCookie(
  creds: Record<string, string>,
  signal: AbortSignal,
): Promise<UsageSnapshot> {
  const cookie = (creds.cookie ?? "").trim();
  if (!cookie) throw new Error(`[${PROVIDER_ID}] missing cookie`);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": UA,
    cookie: `WorkosCursorSessionToken=${cookie}`,
  };

  const usage = await jsonFetch<CookieUsageResponse>({
    providerId: PROVIDER_ID,
    url: `${CURSOR_DASH_BASE}/api/dashboard/get-current-period-usage`,
    method: "POST",
    headers,
    body: "{}",
    signal,
  });

  const spentCents = num(usage.usageBasedPricing?.totalSpendCents);
  const limitCents = num(usage.usageBasedPricing?.hardLimitCents);
  const fastUsed = num(usage.fastPremiumRequests?.numRequests);
  const fastMax = num(usage.fastPremiumRequests?.maxRequestUsage);

  const snap: UsageSnapshot = {
    providerId: PROVIDER_ID,
    fetchedAt: new Date().toISOString(),
    session: {
      inputTokens: 0,
      outputTokens: 0,
      requests: fastUsed,
      costUsd: spentCents / 100,
    },
    errors: ["Cookie mode: only aggregated request count is exposed; per-token data unavailable."],
  };

  if (fastMax > 0 && usage.subscriptionCycleEnd) {
    snap.quota = {
      period: "cycle",
      limit: fastMax,
      used: fastUsed,
      unit: "requests",
      resetsAt: new Date(usage.subscriptionCycleEnd).toISOString(),
    };
  } else if (limitCents > 0 && usage.subscriptionCycleEnd) {
    snap.quota = {
      period: "cycle",
      limit: limitCents / 100,
      used: spentCents / 100,
      unit: "usd",
      resetsAt: new Date(usage.subscriptionCycleEnd).toISOString(),
    };
  }

  return snap;
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "Cursor",
  iconSlug: "cursor",
  // Cookie path is the more common consumer path; even though apiKey is
  // official, the public adapter is documented as best-effort.
  status: "unofficial",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "mode",
      label: "Mode (apiKey or cookie)",
      type: "apiKey",
      secret: false,
      placeholder: "apiKey | cookie",
    },
    {
      key: "apiKey",
      label: "Team Admin API Key",
      type: "apiKey",
      secret: true,
      placeholder: "key_...",
      helpUrl: "https://docs.cursor.com/account/teams/admin-api-keys",
    },
    {
      key: "cookie",
      label: "WorkosCursorSessionToken",
      type: "cookie",
      secret: true,
      placeholder: "(cookie value)",
    },
  ],

  async verify(creds, signal) {
    const mode = getMode(creds);
    if (mode === "apiKey") {
      const apiKey = (creds.apiKey ?? "").trim();
      if (!apiKey) throw new Error(`[${PROVIDER_ID}] missing apiKey`);
      const headers: Record<string, string> = {
        Authorization: basicAuthHeader(apiKey),
        "content-type": "application/json",
      };
      await jsonFetch<ApiKeyEventsResponse>({
        providerId: PROVIDER_ID,
        url: `${CURSOR_API_BASE}/teams/filtered-usage-events`,
        method: "POST",
        headers,
        body: JSON.stringify({
          startDate: startOfTodayUtcMs(),
          endDate: Date.now(),
          page: 1,
          pageSize: 1,
        }),
        signal,
      });
      return;
    }
    const cookie = (creds.cookie ?? "").trim();
    if (!cookie) throw new Error(`[${PROVIDER_ID}] missing cookie`);
    await jsonFetch<CookieUsageResponse>({
      providerId: PROVIDER_ID,
      url: `${CURSOR_DASH_BASE}/api/dashboard/get-current-period-usage`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": UA,
        cookie: `WorkosCursorSessionToken=${cookie}`,
      },
      body: "{}",
      signal,
    });
  },

  async fetchUsage(creds, signal) {
    const mode = getMode(creds);
    return mode === "apiKey" ? fetchApiKey(creds, signal) : fetchCookie(creds, signal);
  },
};

export default adapter;
