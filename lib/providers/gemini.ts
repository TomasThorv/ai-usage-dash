import { Buffer } from "node:buffer";
import { createSign } from "node:crypto";
import { pollIntervalMs } from "@/lib/config/budgets";
import { jsonFetch, nextMidnightPacificIso } from "@/lib/providers/_http";
import type { ProviderAdapter, UsageSnapshot } from "@/lib/providers/types";

const PROVIDER_ID = "gemini" as const;
const QUOTA_BASE = "https://cloudquotas.googleapis.com";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const SERVICE = "generativelanguage.googleapis.com";

interface ServiceAccountJson {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
}

interface DimensionsInfo {
  dimensions?: Record<string, string>;
  details?: { value?: string | number };
  applicableLocations?: string[];
}

interface QuotaInfo {
  name?: string;
  quotaId?: string;
  metric?: string;
  refreshInterval?: string;
  dimensionsInfos?: DimensionsInfo[];
}

interface QuotaInfosResponse {
  quotaInfos?: QuotaInfo[];
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseServiceAccount(creds: Record<string, string>): ServiceAccountJson {
  const raw = (creds.serviceAccountJson ?? "").trim();
  if (!raw) throw new Error(`[${PROVIDER_ID}] missing serviceAccountJson`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[${PROVIDER_ID}] serviceAccountJson is not valid JSON`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`[${PROVIDER_ID}] serviceAccountJson is not an object`);
  }
  const sa = parsed as ServiceAccountJson;
  if (!sa.client_email || !sa.private_key) {
    throw new Error(`[${PROVIDER_ID}] service account missing client_email or private_key`);
  }
  return sa;
}

async function getAccessToken(creds: Record<string, string>, signal: AbortSignal): Promise<string> {
  const sa = parseServiceAccount(creds);
  const cacheKey = sa.client_email ?? "";
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs - Date.now() > 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri ?? TOKEN_URL;
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };
  const headerB64 = b64url(JSON.stringify(header));
  const claimB64 = b64url(JSON.stringify(claim));
  const signingInput = `${headerB64}.${claimB64}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  let signature: Buffer;
  try {
    signature = signer.sign(sa.private_key as string);
  } catch {
    throw new Error(`[${PROVIDER_ID}] failed to sign JWT (invalid private_key)`);
  }
  const jwt = `${signingInput}.${b64url(signature)}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  }).toString();

  const tok = await jsonFetch<TokenResponse>({
    providerId: PROVIDER_ID,
    url: tokenUri,
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal,
  });
  if (!tok.access_token) {
    throw new Error(`[${PROVIDER_ID}] token endpoint did not return access_token`);
  }
  const ttl = typeof tok.expires_in === "number" ? tok.expires_in : 3600;
  tokenCache.set(cacheKey, {
    token: tok.access_token,
    expiresAtMs: Date.now() + ttl * 1000,
  });
  return tok.access_token;
}

function quotaUrl(projectId: string): string {
  return `${QUOTA_BASE}/v1/projects/${encodeURIComponent(projectId)}/locations/global/services/${SERVICE}/quotaInfos`;
}

function pickDailyQuota(infos: QuotaInfo[]): QuotaInfo | undefined {
  return (
    infos.find((q) => (q.quotaId ?? "").includes("PerDayPerProject")) ??
    infos.find((q) => (q.refreshInterval ?? "").toLowerCase() === "day")
  );
}

const adapter: ProviderAdapter = {
  id: PROVIDER_ID,
  displayName: "Gemini (Google)",
  iconSlug: "gemini",
  status: "official",
  pollIntervalMs: pollIntervalMs(PROVIDER_ID),
  authFields: [
    {
      key: "serviceAccountJson",
      label: "Service-account JSON",
      type: "serviceAccountJson",
      secret: true,
      helpUrl: "https://cloud.google.com/iam/docs/service-accounts-create",
    },
    {
      key: "projectId",
      label: "Google Cloud project ID",
      type: "orgSlug",
      secret: false,
    },
  ],

  async verify(creds, signal) {
    const projectId = (creds.projectId ?? "").trim();
    if (!projectId) throw new Error(`[${PROVIDER_ID}] missing projectId`);
    const token = await getAccessToken(creds, signal);
    await jsonFetch<QuotaInfosResponse>({
      providerId: PROVIDER_ID,
      url: quotaUrl(projectId),
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      signal,
    });
  },

  async fetchUsage(creds, signal): Promise<UsageSnapshot> {
    const projectId = (creds.projectId ?? "").trim();
    if (!projectId) throw new Error(`[${PROVIDER_ID}] missing projectId`);
    const token = await getAccessToken(creds, signal);
    const data = await jsonFetch<QuotaInfosResponse>({
      providerId: PROVIDER_ID,
      url: quotaUrl(projectId),
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
      signal,
    });

    const infos = data.quotaInfos ?? [];
    const daily = pickDailyQuota(infos);
    let limit = 0;
    if (daily?.dimensionsInfos && daily.dimensionsInfos.length > 0) {
      // Sum across model dimensions if present, else take the first.
      let total = 0;
      for (const d of daily.dimensionsInfos) {
        const v = d.details?.value;
        const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? "0"));
        if (Number.isFinite(n)) total += n;
      }
      limit = total;
    }

    const snap: UsageSnapshot = {
      providerId: PROVIDER_ID,
      fetchedAt: new Date().toISOString(),
      session: {
        inputTokens: 0,
        outputTokens: 0,
        requests: 0,
        costUsd: 0,
      },
      errors: ["Consumption not exposed by Gemini API; ceiling only."],
    };

    if (limit > 0) {
      snap.quota = {
        period: "day",
        limit,
        used: 0,
        unit: "requests",
        resetsAt: nextMidnightPacificIso(),
      };
    }

    return snap;
  },
};

export default adapter;
