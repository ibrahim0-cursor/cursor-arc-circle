import { NextResponse } from "next/server";
import {
  GMGN_ANALYTICS_SKILL_IDS,
  GMGN_SKILL_CLI,
  isGmgnAnalyticsSkill,
  runGmgnAnalyticsSkill,
  type GmgnAnalyticsParams,
  type GmgnAnalyticsSkillId,
} from "@/lib/gmgn-analytics";
import { hasGmgnApiKey, type GmgnChain } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

function parseParams(searchParams: URLSearchParams): GmgnAnalyticsParams {
  const num = (k: string) => {
    const v = searchParams.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  const types = searchParams.getAll("type").filter(Boolean);
  const platforms = searchParams.getAll("platform").filter(Boolean);

  return {
    chain: (searchParams.get("chain") ?? undefined) as GmgnChain | undefined,
    address: searchParams.get("address") ?? undefined,
    interval: searchParams.get("interval") ?? undefined,
    resolution: searchParams.get("resolution") ?? undefined,
    limit: num("limit"),
    orderBy: searchParams.get("orderBy") ?? searchParams.get("order_by") ?? undefined,
    direction: (searchParams.get("direction") as "asc" | "desc") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    types: types.length ? types : undefined,
    platform: searchParams.get("platform") ?? undefined,
    platforms: platforms.length ? platforms : undefined,
    from: num("from"),
    to: num("to"),
    minRenownedCount: num("minRenownedCount") ?? num("min_renowned_count"),
    maxMarketcap: num("maxMarketcap") ?? num("max_marketcap"),
    filterPreset: searchParams.get("filterPreset") ?? searchParams.get("filter_preset") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? searchParams.get("sort_by") ?? undefined,
  };
}

async function handle(skill: GmgnAnalyticsSkillId, params: GmgnAnalyticsParams) {
  if (!hasGmgnApiKey()) {
    return NextResponse.json(
      {
        error: "GMGN_API_KEY not configured",
        skill,
        cliFallback: GMGN_SKILL_CLI[skill],
        skills: GMGN_ANALYTICS_SKILL_IDS,
      },
      { status: 503 },
    );
  }

  const result = await runGmgnAnalyticsSkill(skill, params);
  return NextResponse.json(result, { status: result.ok ? 200 : result.status || 502 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skill = searchParams.get("skill")?.trim() ?? "";

  if (!isGmgnAnalyticsSkill(skill)) {
    return NextResponse.json(
      {
        error: "Invalid or missing skill",
        skills: GMGN_ANALYTICS_SKILL_IDS,
        example:
          "/api/nexus/gmgn/analytics?skill=five-min-trending&chain=sol",
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
    address?: string;
    interval?: string;
    resolution?: string;
    limit?: number;
    orderBy?: string;
    direction?: "asc" | "desc";
    tag?: string;
    type?: string;
    types?: string[];
    platform?: string;
    platforms?: string[];
    from?: number;
    to?: number;
    minRenownedCount?: number;
    maxMarketcap?: number;
    filterPreset?: string;
    sortBy?: string;
  };

  const skill = body.skill?.trim() ?? "";
  if (!isGmgnAnalyticsSkill(skill)) {
    return NextResponse.json(
      { error: "Invalid or missing skill", skills: GMGN_ANALYTICS_SKILL_IDS },
      { status: 400 },
    );
  }

  return handle(skill, body);
}
