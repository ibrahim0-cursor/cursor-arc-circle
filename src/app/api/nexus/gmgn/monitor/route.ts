import { NextResponse } from "next/server";
import {
  GMGN_MONITOR_SKILL_IDS,
  GMGN_MONITOR_CLI,
  isGmgnMonitorSkill,
  runGmgnMonitorSkill,
  type GmgnMonitorParams,
  type GmgnMonitorSkillId,
} from "@/lib/gmgn-monitor";
import { hasGmgnApiKey, type GmgnChain } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

function parseParams(searchParams: URLSearchParams): GmgnMonitorParams {
  const limitRaw = searchParams.get("limit");
  const types = searchParams.getAll("signalType").map(Number).filter((n) => !Number.isNaN(n));
  return {
    chain: (searchParams.get("chain") ?? undefined) as GmgnChain | undefined,
    limit: limitRaw ? Number(limitRaw) : undefined,
    side: (searchParams.get("side") as "buy" | "sell") ?? undefined,
    signalTypes: types.length ? types : undefined,
  };
}

async function handle(skill: GmgnMonitorSkillId, params: GmgnMonitorParams) {
  if (!hasGmgnApiKey()) {
    return NextResponse.json(
      {
        error: "GMGN_API_KEY not configured",
        skill,
        cliFallback: GMGN_MONITOR_CLI[skill],
        skills: GMGN_MONITOR_SKILL_IDS,
      },
      { status: 503 },
    );
  }

  const result = await runGmgnMonitorSkill(skill, params);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status || 502 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get("skill")?.trim() ?? "";

  if (!isGmgnMonitorSkill(skill)) {
    return NextResponse.json(
      {
        error: "Invalid or missing skill",
        skills: GMGN_MONITOR_SKILL_IDS,
        example: "/api/nexus/gmgn/monitor?skill=smart-money-buy-signal&chain=sol",
      },
      { status: 400 },
    );
  }

  return handle(skill, parseParams(searchParams));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    skill?: string;
    chain?: GmgnChain;
    limit?: number;
    side?: "buy" | "sell";
    signalTypes?: number[];
  };

  const skill = body.skill?.trim() ?? "";
  if (!isGmgnMonitorSkill(skill)) {
    return NextResponse.json(
      { error: "Invalid or missing skill", skills: GMGN_MONITOR_SKILL_IDS },
      { status: 400 },
    );
  }

  return handle(skill, body);
}
