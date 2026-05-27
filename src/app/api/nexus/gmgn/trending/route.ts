import { NextResponse } from "next/server";
import { fetchGmgnMarketRank, hasGmgnApiKey, type GmgnChain } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasGmgnApiKey()) {
    return NextResponse.json({ error: "GMGN_API_KEY not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const chain = (searchParams.get("chain") ?? "sol") as GmgnChain;
  const interval = searchParams.get("interval") ?? "1h";
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const tokens = await fetchGmgnMarketRank(chain, interval, limit);
  return NextResponse.json({ chain, interval, count: tokens.length, tokens });
}
