import { listAdapters } from "@/lib/providers/registry";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(): NextResponse {
  const providers = listAdapters().map((a) => ({
    id: a.id,
    displayName: a.displayName,
    iconSlug: a.iconSlug,
    authFields: a.authFields,
    pollIntervalMs: a.pollIntervalMs,
    status: a.status,
  }));
  return NextResponse.json({ providers });
}
