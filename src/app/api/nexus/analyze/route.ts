import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { analyzeTokenSignal, buildDecision } from "@/lib/nexus-agent";
import { fetchTokenIntel } from "@/lib/birdeye";
import { birdeyeChainFor } from "@/lib/testnet-chains";
import { computeTechnicalAnalysis, normalizePriceChanges } from "@/lib/technical-analysis";
import { addNexusDecision } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      chainId: string;
      tokenAddress: string;
      deep?: boolean;
      arcFeeTxHash?: string;
      save?: boolean;
    };

    if (!body.chainId || !body.tokenAddress) {
      return NextResponse.json({ error: "chainId and tokenAddress required" }, { status: 400 });
    }

    const token = await fetchTokenByAddress(body.chainId, body.tokenAddress);
    if (!token) {
      return NextResponse.json({ error: "Token not found on DexScreener" }, { status: 404 });
    }

    const ta = computeTechnicalAnalysis(
      token.priceUsd,
      normalizePriceChanges(token.priceChange, token.change24h),
      token.volume24h,
      token.liquidityUsd,
    );

    if (body.deep && body.save !== false) {
      const decision = await buildDecision(token, body.arcFeeTxHash);
      await addNexusDecision(decision);
      return NextResponse.json({
        token,
        agent: decision,
        technical: ta,
        intel: decision.intel,
        saved: true,
        message: `AI deep analysis complete — ${decision.action} signal saved with RSI ${ta.rsi}, MACD ${ta.macdSignal}`,
      });
    }

    const { intel } = await fetchTokenIntel(token.tokenAddress, birdeyeChainFor(token.chainId));
    const enrichedIntel = {
      ...intel,
      technical: {
        rsi: ta.rsi,
        rsiSignal: ta.rsiSignal,
        macd: ta.macd,
        macdSignal: ta.macdSignal,
        trend: ta.trend,
        trendLine: ta.trendLine,
        score: ta.score,
      },
    };
    const agent = await analyzeTokenSignal(token, enrichedIntel, body.deep ?? false);

    return NextResponse.json({
      token,
      intel: enrichedIntel,
      agent,
      technical: ta,
      mode: body.deep ? "deep" : "quick",
      message: `${agent.action} · confidence ${agent.confidence}% · TA score ${ta.score}/100`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 500 },
    );
  }
}
