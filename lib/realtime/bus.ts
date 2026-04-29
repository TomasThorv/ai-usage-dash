import { EventEmitter } from "node:events";
import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";

export type ErrorKind = "auth" | "network" | "parse" | "rate_limit" | "unknown";

export interface BusErrorEvent {
  providerId: ProviderId;
  kind: ErrorKind;
  message: string;
}

export interface BusHeartbeat {
  t: number;
}

export interface BusEvents {
  snapshot: UsageSnapshot;
  error: BusErrorEvent;
  heartbeat: BusHeartbeat;
}

export interface TypedBus {
  on<K extends keyof BusEvents>(event: K, listener: (payload: BusEvents[K]) => void): TypedBus;
  off<K extends keyof BusEvents>(event: K, listener: (payload: BusEvents[K]) => void): TypedBus;
  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __aiUsageBus: EventEmitter | undefined;
}

function build(): EventEmitter {
  const e = new EventEmitter();
  e.setMaxListeners(0);
  return e;
}

export function getBus(): TypedBus {
  if (!globalThis.__aiUsageBus) {
    globalThis.__aiUsageBus = build();
  }
  return globalThis.__aiUsageBus as unknown as TypedBus;
}
