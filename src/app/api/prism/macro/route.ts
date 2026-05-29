import { NextResponse } from "next/server";
import { buildPrismMacroSnapshot } from "@/lib/prism-macro-snapshot";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const eventId =
    new URL(request.url).searchParams.get("eventId")?.trim() || "fed-cut-june";
  const snapshot = await buildPrismMacroSnapshot(eventId);
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
