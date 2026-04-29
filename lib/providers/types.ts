export type ProviderId = "claude" | "openai" | "cursor" | "opencode" | "gemini" | "copilot";

export interface AuthField {
  key: string;
  label: string;
  type: "apiKey" | "oauth" | "cookie" | "serviceAccountJson" | "orgSlug";
  secret: boolean;
  placeholder?: string;
  helpUrl?: string;
}

export interface UsageSnapshotSession {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  requests: number;
  costUsd: number;
}

export interface UsageSnapshotQuota {
  period: "minute" | "hour" | "day" | "week" | "month" | "cycle";
  limit: number;
  used: number;
  unit: "tokens" | "requests" | "usd" | "seats";
  resetsAt: string;
}

export interface UsageSnapshotModelEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  costUsd: number;
}

export interface UsageSnapshot {
  providerId: ProviderId;
  fetchedAt: string;
  session: UsageSnapshotSession;
  quota?: UsageSnapshotQuota;
  modelBreakdown?: UsageSnapshotModelEntry[];
  raw?: unknown;
  errors?: string[];
}

export interface ProviderAdapter {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly iconSlug: string;
  readonly authFields: ReadonlyArray<AuthField>;
  readonly pollIntervalMs: number;
  readonly status: "official" | "unofficial";
  fetchUsage(creds: Record<string, string>, signal: AbortSignal): Promise<UsageSnapshot>;
  verify(creds: Record<string, string>, signal: AbortSignal): Promise<void>;
}
