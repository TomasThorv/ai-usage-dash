import { boot } from "@/lib/boot";
import type { ProviderId, UsageSnapshot } from "@/lib/providers/types";
import { type BusErrorEvent, type BusHeartbeat, getBus } from "@/lib/realtime/bus";
import * as cache from "@/lib/realtime/cache";
import { formatEvent } from "@/lib/realtime/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HEARTBEAT_MS = 15_000;
const CLOSE_BEFORE_MS = 5_000;

function snapshotEventId(s: UsageSnapshot): string {
  return `${Date.parse(s.fetchedAt)}-${s.providerId}`;
}

function parseLastEventId(headerValue: string | null): number {
  if (!headerValue) return 0;
  const dash = headerValue.indexOf("-");
  const msStr = dash > 0 ? headerValue.slice(0, dash) : headerValue;
  const ms = Number.parseInt(msStr, 10);
  return Number.isFinite(ms) ? ms : 0;
}

export async function GET(request: Request): Promise<Response> {
  await boot();

  const lastEventIdMs = parseLastEventId(request.headers.get("last-event-id"));

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const bus = getBus();
      let closed = false;
      const queued = new Map<ProviderId, UsageSnapshot>();
      let drainScheduled = false;

      const safeEnqueue = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const drain = (): void => {
        drainScheduled = false;
        if (closed) return;
        for (const [, snap] of queued) {
          safeEnqueue(formatEvent("snapshot", snapshotEventId(snap), snap));
        }
        queued.clear();
      };

      const scheduleDrain = (): void => {
        if (drainScheduled || closed) return;
        drainScheduled = true;
        setImmediate(drain);
      };

      const onSnapshot = (s: UsageSnapshot): void => {
        queued.set(s.providerId, s);
        scheduleDrain();
      };

      const onError = (e: BusErrorEvent): void => {
        if (closed) return;
        const id = `${Date.now()}-${e.providerId}`;
        safeEnqueue(formatEvent("error", id, e));
      };

      const onHeartbeat = (h: BusHeartbeat): void => {
        if (closed) return;
        safeEnqueue(formatEvent("heartbeat", undefined, h));
      };

      // Initial snapshot replay (skip ones older than last-event-id).
      for (const snap of cache.getAll()) {
        const ms = Date.parse(snap.fetchedAt);
        if (ms <= lastEventIdMs) continue;
        safeEnqueue(formatEvent("snapshot", snapshotEventId(snap), snap));
      }

      bus.on("snapshot", onSnapshot);
      bus.on("error", onError);
      bus.on("heartbeat", onHeartbeat);

      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        const payload: BusHeartbeat = { t: Date.now() };
        safeEnqueue(formatEvent("heartbeat", undefined, payload));
      }, HEARTBEAT_MS);

      const closeTimer = setTimeout(
        () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // already closed
          }
        },
        Math.max(maxDuration * 1000 - CLOSE_BEFORE_MS, 1_000),
      );

      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatInterval);
        clearTimeout(closeTimer);
        bus.off("snapshot", onSnapshot);
        bus.off("error", onError);
        bus.off("heartbeat", onHeartbeat);
        queued.clear();
      };

      const signal = request.signal;
      if (signal.aborted) {
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
        return;
      }
      signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });

      // expose cleanup for cancel()
      (controller as unknown as { __cleanup?: () => void }).__cleanup = cleanup;
    },
    cancel() {
      // controller.cancel — best effort. The start handler attaches abort
      // listener which clears intervals; nothing else to do here.
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
