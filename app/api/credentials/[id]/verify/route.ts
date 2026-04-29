import { boot } from "@/lib/boot";
import { CSRF_COOKIE } from "@/lib/config/csrf";
import { validate as csrfValidate } from "@/lib/crypto/csrf";
import { seal } from "@/lib/crypto/sealedBox";
import * as credentialsDb from "@/lib/db/credentials";
import { getAdapter, listAdapters } from "@/lib/providers/registry";
import type { ProviderId } from "@/lib/providers/types";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const VERIFY_TIMEOUT_MS = 10_000;

const PROVIDER_IDS = listAdapters().map((a) => a.id) as [ProviderId, ...ProviderId[]];
const providerIdSchema = z.enum(PROVIDER_IDS);

const bodySchema = z.object({
  creds: z.record(z.string(), z.string().min(1)),
});

async function checkCsrf(req: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE)?.value ?? null;
  const headerValue = req.headers.get("x-csrf-token");
  return csrfValidate(headerValue, cookieValue);
}

function sanitize(message: string): string {
  // strip control chars, cap length, drop anything looking like a key
  let out = "";
  for (const ch of message) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) continue;
    out += ch;
  }
  return out.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 200);
}

function bad(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  await boot();
  if (!(await checkCsrf(req))) return bad(403, "invalid csrf");

  const { id } = await context.params;
  const idParsed = providerIdSchema.safeParse(id);
  if (!idParsed.success) return bad(400, "unknown provider");
  const providerId: ProviderId = idParsed.data;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "invalid json");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return bad(400, "invalid body");

  const adapter = getAdapter(providerId);
  let creds: Record<string, string> | null = parsed.data.creds;
  for (const f of adapter.authFields) {
    const v = creds[f.key];
    if (typeof v !== "string" || v.length === 0) {
      return bad(400, `missing field ${f.key}`);
    }
  }

  try {
    await adapter.verify(creds, AbortSignal.timeout(VERIFY_TIMEOUT_MS));
  } catch (err) {
    const msg = sanitize(err instanceof Error ? err.message : "verify failed");
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }

  try {
    const blob = await seal(JSON.stringify(creds));
    creds = null;
    credentialsDb.upsert(providerId, blob);
    credentialsDb.markVerified(providerId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "persist failed" }, { status: 500 });
  }
}
