import type { ProviderAdapter, ProviderId } from "@/lib/providers/types";
import { type ErrorKind, getBus } from "@/lib/realtime/bus";
import * as cache from "@/lib/realtime/cache";

export type PollerCredentialsResolver = (id: ProviderId) => Promise<Record<string, string> | null>;

interface AdapterState {
  inFlight: boolean;
  timer: ReturnType<typeof setInterval> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __aiUsagePoller: Poller | undefined;
}

function classifyError(err: unknown): ErrorKind {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes("401") || m.includes("403") || m.includes("auth")) {
      return "auth";
    }
    if (m.includes("429") || m.includes("rate")) return "rate_limit";
    if (m.includes("parse") || m.includes("json")) return "parse";
    if (
      m.includes("fetch") ||
      m.includes("network") ||
      m.includes("timeout") ||
      m.includes("abort")
    ) {
      return "network";
    }
  }
  return "unknown";
}

export class Poller {
  private adapters = new Map<ProviderId, ProviderAdapter>();
  private states = new Map<ProviderId, AdapterState>();
  private resolver: PollerCredentialsResolver;
  private running = false;

  constructor(resolver: PollerCredentialsResolver) {
    this.resolver = resolver;
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
    if (!this.states.has(adapter.id)) {
      this.states.set(adapter.id, { inFlight: false, timer: null });
    }
    if (this.running) this.startAdapter(adapter);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const a of this.adapters.values()) this.startAdapter(a);
  }

  stop(): void {
    this.running = false;
    for (const s of this.states.values()) {
      if (s.timer) {
        clearInterval(s.timer);
        s.timer = null;
      }
    }
  }

  private startAdapter(adapter: ProviderAdapter): void {
    const state = this.states.get(adapter.id);
    if (!state) return;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
      void this.tick(adapter);
    }, adapter.pollIntervalMs);
  }

  async tick(adapter: ProviderAdapter): Promise<void> {
    const state = this.states.get(adapter.id) ?? {
      inFlight: false,
      timer: null,
    };
    if (state.inFlight) return;
    state.inFlight = true;
    this.states.set(adapter.id, state);

    const ctrl = new AbortController();
    const timeoutMs = Math.min(adapter.pollIntervalMs - 500, 10_000);
    const timeout = setTimeout(() => ctrl.abort(), Math.max(timeoutMs, 500));

    try {
      const creds = await this.resolver(adapter.id);
      if (!creds) return;
      const snap = await adapter.fetchUsage(creds, ctrl.signal);
      cache.set(snap);
      getBus().emit("snapshot", snap);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      getBus().emit("error", {
        providerId: adapter.id,
        kind: classifyError(err),
        message,
      });
    } finally {
      clearTimeout(timeout);
      state.inFlight = false;
      this.states.set(adapter.id, state);
    }
  }
}

export function getPoller(resolver: PollerCredentialsResolver): Poller {
  if (!globalThis.__aiUsagePoller) {
    globalThis.__aiUsagePoller = new Poller(resolver);
  }
  return globalThis.__aiUsagePoller;
}

export function resetPollerForTests(): void {
  if (globalThis.__aiUsagePoller) {
    globalThis.__aiUsagePoller.stop();
    globalThis.__aiUsagePoller = undefined;
  }
}
