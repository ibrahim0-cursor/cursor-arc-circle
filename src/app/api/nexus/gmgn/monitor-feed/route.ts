import { NextResponse } from "next/server";
import { fetchGmgnMonitorTokens } from "@/lib/gmgn-monitor-feed";
import { hasGmgnApiKey, type GmgnChain } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasGmgnApiKey()) {
    return NextResponse.json({ error: "GMGN_API_KEY not configured" }, { status: 503 });
  }

  const chain = (new URL(request.url).searchParams.get("chain") ?? "sol") as GmgnChain;
  const result = await fetchGmgnMonitorTokens(chain);
  return NextResponse.json({
    ok: result.tokens.length > 0,
    chain,
    count: result.tokens.length,
    sources: result.sources,
    errors: result.errors,
    tokens: result.tokens.slice(0, 50),
  });
}
