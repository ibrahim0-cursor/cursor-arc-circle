import { NextResponse } from "next/server";
import { fetchGmgnSkillsCatalog, searchGmgnSkills } from "@/lib/gmgn-skills";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const limit = Math.min(20, Math.max(1, Number(searchParams.get("limit") ?? 8)));

  const catalog = await fetchGmgnSkillsCatalog();
  const results = q.trim() ? searchGmgnSkills(catalog, q, limit) : catalog.slice(0, limit);

  return NextResponse.json({
    count: results.length,
    total: catalog.length,
    query: q.trim() || null,
    skills: results,
    catalogSource: catalog.length > 6 ? "live-or-bundled" : "bundled",
  });
}
