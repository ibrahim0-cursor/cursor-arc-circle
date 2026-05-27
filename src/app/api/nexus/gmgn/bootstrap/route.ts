import { NextResponse } from "next/server";
import { GMGN_ANALYTICS_BASE_INSTALL, GMGN_SKILL_CLI } from "@/lib/gmgn-analytics";
import { GMGN_DATA_ANALYTICS_SKILLS, probeGmgnAnalyticsSkills } from "@/lib/gmgn-discovery";
import { fetchGmgnSkillsCatalog, getGmgnSkillById } from "@/lib/gmgn-skills";
import { hasGmgnApiKey } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

/** Enable all 12 Data Analytics skills on ARC (server-side; no gmgn-cli on Vercel). */
export async function POST() {
  if (!hasGmgnApiKey()) {
    return NextResponse.json(
      {
        error: "GMGN_API_KEY not configured on server",
        register: "https://gmgn.ai/ai",
      },
      { status: 503 },
    );
  }

  const catalog = await fetchGmgnSkillsCatalog();
  const skills = GMGN_DATA_ANALYTICS_SKILLS.map((id) => {
    const skill = getGmgnSkillById(catalog, id);
    return {
      id,
      title: skill?.title ?? id,
      cli: GMGN_SKILL_CLI[id],
      installation: skill?.installation ?? GMGN_ANALYTICS_BASE_INSTALL,
      api: `/api/nexus/gmgn/analytics?skill=${id}&chain=sol`,
    };
  });

  const probe = await probeGmgnAnalyticsSkills("sol");

  return NextResponse.json({
    ok: true,
    message:
      "All 12 GMGN Data Analytics skills are active on ARC via OpenAPI. Use /api/nexus/gmgn/analytics per skill.",
    baseInstall: GMGN_ANALYTICS_BASE_INSTALL,
    skills,
    probe,
    examples: {
      trending: "/api/nexus/gmgn/analytics?skill=five-min-trending&chain=sol",
      security:
        "/api/nexus/gmgn/analytics?skill=token-security-check&chain=sol&address=So11111111111111111111111111111111111111112",
      discovery: "/api/nexus/gmgn/discovery?chain=sol",
    },
  });
}

export async function GET() {
  return POST();
}
