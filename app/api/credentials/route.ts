import { boot } from "@/lib/boot";
import { CSRF_COOKIE } from "@/lib/config/csrf";
import { validate as csrfValidate } from "@/lib/crypto/csrf";
import { seal } from "@/lib/crypto/sealedBox";
import * as credentialsDb from "@/lib/db/credentials";
import * as snapshotsDb from "@/lib/db/snapshots";
import { getAdapter, listAdapters } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";
import * as cache from "@/lib/realtime/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const PROVIDER_IDS = listAdapters().map((a) => a.id) as [ProviderId, ...ProviderId[]];
const providerIdSchema = z.enum(PROVIDER_IDS);

const postSchema = z.object({
  providerId: providerIdSchema,
  creds: z.record(z.string(), z.string().min(1)),
});

const deleteSchema = z.union([
  z.object({ providerId: providerIdSchema }),
  z.object({ all: z.literal(true) }),
]);

async function checkCsrf(req: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE)?.value ?? null;
  const headerValue = req.headers.get("x-csrf-token");
  return csrfValidate(headerValue, cookieValue);
}

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function validateCredsShape(providerId: ProviderId, creds: Record<string, string>): string | null {
  const adapter = getAdapter(providerId);
  for (const f of adapter.authFields) {
    const v = creds[f.key];
    if (typeof v !== "string" || v.length === 0) {
      return `missing field ${f.key}`;
    }
  }
  return null;
}

export async function GET(): Promise<NextResponse> {
  await boot();
  const rows = credentialsDb.listAll().map((r) => ({
    providerId: r.providerId,
    lastVerifiedAt: r.lastVerifiedAt,
  }));
  return NextResponse.json({ credentials: rows });
}

export async function POST(req: Request): Promise<NextResponse> {
  await boot();
  if (!(await checkCsrf(req))) return badRequest("invalid csrf", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid json");
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid body");

  const { providerId } = parsed.data;
  let creds: Record<string, string> | null = parsed.data.creds;
  const shapeError = validateCredsShape(providerId, creds);
  if (shapeError) return badRequest(shapeError);

  try {
    const blob = await seal(JSON.stringify(creds));
    // wipe plaintext from this scope
    creds = null;
    credentialsDb.upsert(providerId, blob);
    (globalThis as { __credCount?: unknown }).__credCount = undefined;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "seal failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  await boot();
  if (!(await checkCsrf(req))) return badRequest("invalid csrf", 403);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid json");
  }
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) return badRequest("invalid body");
  if ("all" in parsed.data) {
    const credCount = credentialsDb.deleteAll();
    snapshotsDb.deleteAll();
    cache.clear();
    // Bust the home-page first-run count cache so the very next request sees 0.
    (globalThis as { __credCount?: unknown }).__credCount = undefined;
    return NextResponse.json({ ok: true, deleted: credCount });
  }
  credentialsDb.remove(parsed.data.providerId);
  (globalThis as { __credCount?: unknown }).__credCount = undefined;
  return NextResponse.json({ ok: true });
}
