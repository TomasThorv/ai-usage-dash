import { boot } from "@/lib/boot";
import * as cache from "@/lib/realtime/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  await boot();
  return NextResponse.json({ snapshots: cache.getAll() });
}
