import { NextResponse } from "next/server";
import { GMGN_ANALYTICS_BASE_INSTALL, GMGN_SKILL_CLI } from "@/lib/gmgn-analytics";
import { GMGN_DATA_ANALYTICS_SKILLS, probeGmgnAnalyticsSkills } from "@/lib/gmgn-discovery";
import {
  GMGN_MONITOR_BASE_INSTALL,
  GMGN_MONITOR_CLI,
  GMGN_MONITOR_SKILL_IDS,
  probeGmgnMonitorSkills,
} from "@/lib/gmgn-monitor";
import { fetchGmgnSkillsCatalog, getGmgnSkillById } from "@/lib/gmgn-skills";
import { hasGmgnApiKey } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

/** Enable GMGN skills on ARC (server-side OpenAPI). ?scope=analytics|monitor|all */
export async function POST(request: Request) {
  if (!hasGmgnApiKey()) {
    return NextResponse.json(
      {
        error: "GMGN_API_KEY not configured on server",
        register: "https://gmgn.ai/ai",
      },
      { status: 503 },
    );
  }

  const scope =
    new URL(request.url).searchParams.get("scope")?.trim().toLowerCase() ?? "all";

  const catalog = await fetchGmgnSkillsCatalog();
  const analyticsSkills =
    scope === "monitor"
      ? []
      : GMGN_DATA_ANALYTICS_SKILLS.map((id) => {
          const skill = getGmgnSkillById(catalog, id);
          return {
            id,
            title: skill?.title ?? id,
            cli: GMGN_SKILL_CLI[id],
            installation: skill?.installation ?? GMGN_ANALYTICS_BASE_INSTALL,
            api: `/api/nexus/gmgn/analytics?skill=${id}&chain=sol`,
          };
        });

  const monitorSkills =
    scope === "analytics"
      ? []
      : GMGN_MONITOR_SKILL_IDS.map((id) => {
          const skill = getGmgnSkillById(catalog, id);
          return {
            id,
            title: skill?.title ?? id,
            cli: GMGN_MONITOR_CLI[id],
            installation: skill?.installation ?? GMGN_MONITOR_BASE_INSTALL,
            api: `/api/nexus/gmgn/monitor?skill=${id}&chain=sol`,
          };
        });

  const [analyticsProbe, monitorProbe] = await Promise.all([
    scope === "monitor" ? null : probeGmgnAnalyticsSkills("sol"),
    scope === "analytics" ? null : probeGmgnMonitorSkills("sol"),
  ]);

  const skills = [...analyticsSkills, ...monitorSkills];

  return NextResponse.json({
    ok: true,
    scope,
    message:
      scope === "monitor"
        ? "All 6 GMGN Monitor skills active on ARC via OpenAPI."
        : scope === "analytics"
          ? "All 12 GMGN Data Analytics skills active on ARC via OpenAPI."
          : "GMGN Analytics + Monitor skills active on ARC via OpenAPI.",
    baseInstall: GMGN_ANALYTICS_BASE_INSTALL,
    skills,
    analyticsProbe,
    monitorProbe,
    examples: {
      analytics: "/api/nexus/gmgn/analytics?skill=five-min-trending&chain=sol",
      monitor: "/api/nexus/gmgn/monitor?skill=smart-money-buy-signal&chain=sol",
      discovery: "/api/nexus/gmgn/discovery?chain=sol",
      monitorFeed: "/api/nexus/gmgn/monitor-feed?chain=sol",
    },
  });
}

export async function GET(request: Request) {
  return POST(request);
}
