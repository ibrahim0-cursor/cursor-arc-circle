import { NextResponse } from "next/server";
import { fetchGmgnSkillsCatalog, getGmgnSkillById } from "@/lib/gmgn-skills";
import { hasGmgnApiKey, hasGmgnPrivateKey } from "@/lib/gmgn-client";

export const dynamic = "force-dynamic";

/** Install on demand — returns skill install instructions after user confirmation (no bulk install). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    skillId?: string;
    confirmed?: boolean;
  };

  if (!body.confirmed) {
    return NextResponse.json(
      { error: "Set confirmed: true after reviewing the skill" },
      { status: 400 },
    );
  }

  const skillId = body.skillId?.trim();
  if (!skillId) {
    return NextResponse.json({ error: "skillId required" }, { status: 400 });
  }

  const catalog = await fetchGmgnSkillsCatalog();
  const skill = getGmgnSkillById(catalog, skillId);
  if (!skill) {
    return NextResponse.json({ error: "Skill not found" }, { status: 404 });
  }

  if (skill.requiresPrivateKey && !hasGmgnPrivateKey()) {
    return NextResponse.json(
      {
        error: "This skill requires GMGN_PRIVATE_KEY on the server (trading). Add via Vercel env.",
        skill,
      },
      { status: 400 },
    );
  }

  if (!hasGmgnApiKey()) {
    return NextResponse.json(
      { error: "GMGN_API_KEY not configured on server", skill },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    installed: skill.id,
    skill,
    message: `Skill "${skill.title}" enabled for this session. Use ARC NEXUS GMGN tools or gmgn-cli locally.`,
    installation: skill.installation,
    nextSteps: [
      "npm install -g gmgn-cli",
      "Set GMGN_API_KEY in .env.local / Vercel",
      skill.requiresPrivateKey ? "Set GMGN_PRIVATE_KEY for trade skills only" : null,
      `npx skills add GMGNAI/gmgn-skills (optional Cursor skill pack)`,
    ].filter(Boolean),
  });
}
