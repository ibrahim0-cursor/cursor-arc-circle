import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { analyzeTokenSignal, buildDecision } from "@/lib/nexus-agent";
import { buildDeepTokenIntel } from "@/lib/deep-token-analysis";
import { scoreTokenSecurity } from "@/lib/token-security";
import { buildResearchReport } from "@/lib/nexus-research";
import { addNexusDecision } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

    const bundle = await buildDeepTokenIntel(token);
    const intelWithTa = bundle.intel;
    const ta = intelWithTa.technical;
    const agent = await analyzeTokenSignal(token, intelWithTa, body.deep ?? false);
    const security = scoreTokenSecurity(token, intelWithTa);
    const research = buildResearchReport({
      token,
      agent,
      intel: intelWithTa,
      technical: ta,
      news: bundle.news,
    });

    const shouldSave = body.save === true || (body.deep === true && body.save !== false);
    if (shouldSave) {
      const decision = await buildDecision(token, body.arcFeeTxHash);
      decision.intel = intelWithTa;
      decision.technical = ta;
      await addNexusDecision(decision);
      return NextResponse.json({
        token,
        agent: decision,
        technical: ta,
        intel: decision.intel,
        research,
        news: bundle.news.slice(0, 4),
        security,
        saved: true,
        mode: body.deep ? "deep" : "quick",
        message: body.deep
          ? `Deep research ready — thesis, risks, and catalysts (signal ${decision.action} is reference only)`
          : `Agent signal ${decision.action} (${decision.confidence}%) saved to history`,
      });
    }

    return NextResponse.json({
      token,
      intel: intelWithTa,
      news: bundle.news.slice(0, 4),
      agent,
      research,
      security,
      technical: ta,
      mode: body.deep ? "deep" : "quick",
      message: `Research report generated — see thesis & risks (not just ${agent.action})`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 500 },
    );
  }
}
