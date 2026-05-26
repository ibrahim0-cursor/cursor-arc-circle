import { NextResponse } from "next/server";
import { fetchTrendingMarketTokens } from "@/lib/dexscreener";
import { analyzeTrendingFeed } from "@/lib/nexus-agent";
import { trendingToDemoToken } from "@/lib/demo-trading";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 24);

    const tokens = await fetchTrendingMarketTokens(limit);
    const analyzed = await analyzeTrendingFeed(tokens);

    const feed = analyzed.map(({ token, intel, signal }) => ({
      ...trendingToDemoToken(token),
      intel,
      agent: signal,
      updatedAt: new Date().toISOString(),
    }));

    const counts = {
      buy: feed.filter((t) => t.agent.action === "BUY").length,
      sell: feed.filter((t) => t.agent.action === "SELL").length,
      hold: feed.filter((t) => t.agent.action === "HOLD").length,
    };

    return NextResponse.json({
      mode: "live-agent-feed",
      settlement: "Arc Testnet USDC",
      updatedAt: new Date().toISOString(),
      refreshSeconds: 45,
      counts,
      tokens: feed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feed failed" },
      { status: 500 },
    );
  }
}
