import { NextResponse } from "next/server";
import { fetchTrendingMarketTokens, fetchTokenByAddress } from "@/lib/dexscreener";
import { filterTradableTokens } from "@/lib/token-filters";
import { analyzeTrendingFeed, analyzeTrendingFeedQuick } from "@/lib/nexus-agent";
import { trendingToDemoToken } from "@/lib/demo-trading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function enrichMissingPairs(
  tokens: Awaited<ReturnType<typeof fetchTrendingMarketTokens>>,
  cap: number,
) {
  const missing = tokens
    .filter((t) => !t.pairAddress)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, cap);

  if (missing.length === 0) return tokens;

  const resolved = await Promise.all(
    missing.map(async (t) => {
      const pair = await fetchTokenByAddress(t.chainId, t.tokenAddress);
      return pair ? { ...pair, intel: t.intel, demoTradeable: true, suggestedNetwork: "arc" } : t;
    }),
  );

  const byKey = new Map(resolved.map((t) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t]));
  return tokens.map((t) => byKey.get(`${t.chainId}:${t.tokenAddress.toLowerCase()}`) ?? t);
}

function buildFeedResponse(
  analyzed: Awaited<ReturnType<typeof analyzeTrendingFeed>>,
  mode: string,
) {
  const feed = analyzed.map(({ token, intel, signal, security }) => ({
    ...trendingToDemoToken(token),
    intel,
    agent: signal,
    security,
    updatedAt: new Date().toISOString(),
  }));

  const counts = {
    buy: feed.filter((t) => t.agent.action === "BUY").length,
    sell: feed.filter((t) => t.agent.action === "SELL").length,
    hold: feed.filter((t) => t.agent.action === "HOLD").length,
  };

  return NextResponse.json({
    mode,
    aiProvider: process.env.GROQ_API_KEY ? "groq" : process.env.OPENAI_API_KEY ? "openai" : "heuristic",
    settlement: "Arc Testnet USDC",
    updatedAt: new Date().toISOString(),
    feedCycle: Math.floor(Date.now() / 45_000),
    refreshSeconds: 45,
    counts,
    tokens: feed,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get("quick") === "1";
    const limit = quick
      ? Math.min(Number(searchParams.get("limit") ?? 50), 60)
      : Math.min(Number(searchParams.get("limit") ?? 60), 80);

    let tokens = filterTradableTokens(await fetchTrendingMarketTokens(limit));
    tokens = await enrichMissingPairs(tokens, quick ? 8 : 16);

    if (quick) {
      const analyzed = await analyzeTrendingFeedQuick(tokens);
      return buildFeedResponse(analyzed, "live-agent-feed-quick");
    }

    const analyzed = await analyzeTrendingFeed(tokens);
    return buildFeedResponse(analyzed, "live-agent-feed");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feed failed" },
      { status: 500 },
    );
  }
}
