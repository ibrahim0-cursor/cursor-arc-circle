import { NextResponse } from "next/server";
import { buildNexusChatContextLite } from "@/lib/nexus-chat-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get("chainId");
    const tokenAddress = searchParams.get("tokenAddress");
    if (!chainId || !tokenAddress) {
      return NextResponse.json({ error: "chainId and tokenAddress required" }, { status: 400 });
    }

    const ctx = await buildNexusChatContextLite(chainId, tokenAddress);
    if (!ctx) {
      return NextResponse.json({ error: "Token not found on DexScreener" }, { status: 404 });
    }

    return NextResponse.json({
      symbol: ctx.token.symbol,
      name: ctx.token.name,
      icon: ctx.token.icon,
      chainId: ctx.token.chainId,
      tokenAddress: ctx.token.tokenAddress,
      priceUsd: ctx.token.priceUsd,
      change24h: ctx.token.change24h,
      volume24h: ctx.token.volume24h,
      liquidityUsd: ctx.token.liquidityUsd,
      marketCap: ctx.token.marketCap,
      fdv: ctx.token.fdv,
      action: ctx.agent.action,
      confidence: ctx.agent.confidence,
      riskScore: ctx.agent.riskScore,
      whyAction: ctx.agent.whyAction ?? ctx.agent.reasoning,
      securityGrade: ctx.security.grade,
      securityLabel: ctx.security.label,
      technical: ctx.intel.technical,
      reasoningHeadline: ctx.reasoningHeadline,
      refreshedAt: ctx.refreshedAt,
      dataSources: ctx.dataSources,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Context failed" },
      { status: 500 },
    );
  }
}
