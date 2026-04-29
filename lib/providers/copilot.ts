import { Buffer } from "node:buffer";
import { gunzipSync } from "node:zlib";
import { pollIntervalMs } from "@/lib/config/budgets";
import {
  ProviderHttpError,
  firstOfNextMonthIso,
  jsonFetch,
  todayYmdUtc,
} from "@/lib/providers/_http";
import type { ProviderAdapter, UsageSnapshot } from "@/lib/providers/types";

const PROVIDER_ID = "copilot" as const;
const GH_BASE = "https://api.github.com";

interface BillingResponse {
  seat_breakdown?: {
    total?: number;
    added_this_cycle?: number;
    pending_invitation?: number;
    pending_cancellation?: number;
    active_this_cycle?: number;
    inactive_this_cycle?: number;
  };
  plan_type?: string;
}

interface MetricsIndex {
  download_links?: string[];
}

interface MetricsBlob {
  date?: string;
  total_active_users?: number;
  total_engaged_users?: number;
  total_code_suggestions?: number;
  total_code_lines_accepted?: number;
}

function buildHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "User-Agent": "ai-usage-dash/0.1",
  };
}

function readCreds(creds: Record<string, string>): { pat: string; org: string } {
  const pat = (creds.pat ?? creds.apiKey ?? "").trim();
  const org = (creds.org ?? "").trim();
  if (!pat) throw new Error(`[${PROVIDER_ID}] missing PAT`);
  if (!org) throw new Error(`[${PROVIDER_ID}] missing org slug`);
  return { pat, org };
}

async function fetchBlob(url: string, signal: AbortSignal): Promise<MetricsBlob> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    const name = err instanceof Error ? err.name : "fetch_failed";
    throw new Error(`[${PROVIDER_ID}] metrics blob network error (${name})`);
  }
  if (!res.ok) {
    throw new ProviderHttpError(PROVIDER_ID, res.status, url, "metrics blob");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  let jsonText: string;
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    try {
      jsonText = gunzipSync(buf).toString("utf8");
    } catch {
      throw new Error(`[${PROVIDER_ID}] failed to gunzip metrics blob`);
    }
  } else {
    jsonText = buf.toString("utf8");
  }
  try {
    const parsed = JSON.parse(jsonText);
    // Some endpoints return an array of daily reports.
    if (Array.isArray(parsed)) return (parsed[0] ?? {}) as MetricsBlob;
    return parsed as MetricsBlob;
  } catch {
    throw new Error(`[${PROVIDER_ID}] metrics blob is not valid JSON`);
  }
}

function planSeatPrice(planType: string | undefined): number {
  return planType === "enterprise" ? 39 : 19;
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "GitHub Copilot",
  iconSlug: "github",
  status: "official",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "pat",
      label: "GitHub PAT (manage_billing:copilot or read:org)",
      type: "apiKey",
      secret: true,
      placeholder: "ghp_...",
      helpUrl: "https://github.com/settings/tokens",
    },
    {
      key: "org",
      label: "Organization slug",
      type: "orgSlug",
      secret: false,
    },
  ],

  async verify(creds, signal) {
    const { pat, org } = readCreds(creds);
    const url = `${GH_BASE}/orgs/${encodeURIComponent(org)}/copilot/billing`;
    await jsonFetch<BillingResponse>({
      providerId: PROVIDER_ID,
      url,
      headers: buildHeaders(pat),
      signal,
    });
  },

  async fetchUsage(creds, signal): Promise<UsageSnapshot> {
    const { pat, org } = readCreds(creds);
    const headers = buildHeaders(pat);

    const billingUrl = `${GH_BASE}/orgs/${encodeURIComponent(org)}/copilot/billing`;
    const day = todayYmdUtc();
    const metricsUrl = `${GH_BASE}/orgs/${encodeURIComponent(org)}/copilot/metrics/reports/organization-1-day?day=${day}`;

    const billing = await jsonFetch<BillingResponse>({
      providerId: PROVIDER_ID,
      url: billingUrl,
      headers,
      signal,
    });

    let metrics: MetricsBlob = {};
    const metricsErrors: string[] = [];
    try {
      const index = await jsonFetch<MetricsIndex>({
        providerId: PROVIDER_ID,
        url: metricsUrl,
        headers,
        signal,
      });
      const link = index.download_links?.[0];
      if (link) {
        metrics = await fetchBlob(link, signal);
      } else {
        metricsErrors.push("Metrics report has no download link yet (reports lag ~24h).");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "metrics_failed";
      metricsErrors.push(msg);
    }

    const total = billing.seat_breakdown?.total ?? 0;
    const active = billing.seat_breakdown?.active_this_cycle ?? 0;
    const pricePerSeat = planSeatPrice(billing.plan_type);
    const costUsd = active * pricePerSeat;

    const requests = metrics.total_code_suggestions ?? 0;
    const outputTokens = metrics.total_code_lines_accepted ?? 0;

    const snap: UsageSnapshot = {
      providerId: PROVIDER_ID,
      fetchedAt: new Date().toISOString(),
      session: {
        inputTokens: 0,
        outputTokens,
        requests,
        costUsd,
      },
      quota: {
        period: "cycle",
        limit: total,
        used: active,
        unit: "seats",
        resetsAt: firstOfNextMonthIso(),
      },
    };
    if (metricsErrors.length > 0) snap.errors = metricsErrors;
    return snap;
  },
};

export default adapter;
