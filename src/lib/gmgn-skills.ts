/**
 * GMGN AI skills directory — search on demand, install on demand.
 * Live catalog: https://gmgn.ai/static/opstatic/skills.json (may be CF-blocked on server).
 * Bundled fallback: src/data/gmgn-skills-catalog.json
 */

import bundled from "@/data/gmgn-skills-catalog.json";

export type GmgnSkill = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  source: string;
  url: string;
  detailUrl?: string;
  installation: string;
  capabilities: string[] | string;
  requiresPrivateKey?: boolean;
};

const SKILLS_JSON_URL = "https://gmgn.ai/static/opstatic/skills.json";

let cache: { at: number; skills: GmgnSkill[] } | null = null;
const CACHE_MS = 60 * 60 * 1000;

function normalizeSkill(raw: Record<string, unknown>): GmgnSkill | null {
  const title = String(raw.title ?? raw.name ?? "").trim();
  if (!title) return null;
  const id = String(raw.id ?? title).trim().toLowerCase().replace(/\s+/g, "-");
  const caps = raw.capabilities;
  const capabilities = Array.isArray(caps)
    ? caps.map(String)
    : typeof caps === "string"
      ? caps.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    id,
    title,
    subtitle: String(raw.subtitle ?? raw.description ?? "").trim(),
    category: String(raw.category ?? "general").trim(),
    source: String(raw.source ?? "GMGN").trim(),
    url: String(raw.url ?? "https://gmgn.ai/ai").trim(),
    detailUrl: raw.detailUrl ? String(raw.detailUrl) : undefined,
    installation: String(raw.installation ?? "").trim(),
    capabilities,
    requiresPrivateKey: Boolean(raw.requiresPrivateKey),
  };
}

function normalizeList(data: unknown): GmgnSkill[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { skills?: unknown }).skills)
      ? (data as { skills: unknown[] }).skills
      : [];
  return rows
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map(normalizeSkill)
    .filter((s): s is GmgnSkill => s !== null);
}

export async function fetchGmgnSkillsCatalog(force = false): Promise<GmgnSkill[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.skills;
  }

  try {
    const res = await fetch(SKILLS_JSON_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; trader-arc/1.0)",
        Referer: "https://gmgn.ai/ai",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) {
      const json = await res.json();
      const skills = normalizeList(json);
      if (skills.length > 0) {
        cache = { at: Date.now(), skills };
        return skills;
      }
    }
  } catch {
    /* use bundled */
  }

  const skills = normalizeList(bundled as GmgnSkill[]);
  cache = { at: Date.now(), skills };
  return skills;
}

export function searchGmgnSkills(skills: GmgnSkill[], query: string, limit = 8): GmgnSkill[] {
  const q = query.trim().toLowerCase();
  if (!q) return skills.slice(0, limit);

  const scored = skills.map((s) => {
    const hay = [
      s.title,
      s.subtitle,
      s.category,
      ...(Array.isArray(s.capabilities) ? s.capabilities : []),
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    if (s.title.toLowerCase().includes(q)) score += 12;
    if (s.category.toLowerCase().includes(q)) score += 8;
    if (hay.includes(q)) score += 5;
    for (const word of q.split(/\s+/)) {
      if (word.length > 2 && hay.includes(word)) score += 2;
    }
    return { s, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export function getGmgnSkillById(skills: GmgnSkill[], id: string): GmgnSkill | undefined {
  const key = id.trim().toLowerCase();
  return skills.find((s) => s.id === key || s.title.toLowerCase() === key);
}
