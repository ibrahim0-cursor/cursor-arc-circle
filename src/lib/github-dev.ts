/**
 * GitHub REST API — developer momentum (optional GITHUB_TOKEN).
 * Not X/Twitter; tracks repo activity for ecosystem / token narratives.
 */

export type GithubDevSignal = {
  score: number;
  summary: string;
  topRepos: string[];
};

function cleanToken(raw?: string): string | undefined {
  const t = raw?.trim().replace(/^['"]|['"]$/g, "");
  return t && t.length >= 8 ? t : undefined;
}

export function hasGithubToken(): boolean {
  return Boolean(cleanToken(process.env.GITHUB_TOKEN) ?? cleanToken(process.env.GH_TOKEN));
}

function authHeaders(): Record<string, string> {
  const token = cleanToken(process.env.GITHUB_TOKEN) ?? cleanToken(process.env.GH_TOKEN);
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Repo search for dev momentum around a token symbol / ecosystem keyword */
export async function fetchGithubDevSignal(
  symbol: string,
  ecosystemHint?: string,
  timeoutMs = 6_000,
): Promise<GithubDevSignal | null> {
  const sym = symbol.replace(/^\$/, "").trim();
  if (sym.length < 2) return null;

  const q = [
    `${sym} crypto in:name,description`,
    ecosystemHint ? `${ecosystemHint} blockchain` : null,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const params = new URLSearchParams({
      q,
      sort: "updated",
      order: "desc",
      per_page: "5",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;

    const json = (await res.json()) as {
      total_count?: number;
      items?: Array<{
        full_name?: string;
        stargazers_count?: number;
        pushed_at?: string;
        description?: string;
      }>;
    };

    const items = json.items ?? [];
    if (items.length === 0) {
      return { score: 0, summary: "No recent GitHub repos matched", topRepos: [] };
    }

    const recent = items.filter((r) => {
      if (!r.pushed_at) return false;
      const days = (Date.now() - new Date(r.pushed_at).getTime()) / 86_400_000;
      return days < 14;
    });

    const stars = items.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
    const score = Math.min(
      100,
      Math.round(recent.length * 18 + Math.min(40, stars / 50) + ((json.total_count ?? 0) > 20 ? 15 : 5)),
    );

    const topRepos = items.slice(0, 3).map((r) => r.full_name ?? "").filter(Boolean);
    const summary =
      recent.length > 0
        ? `${recent.length} repos updated <14d · ${stars.toLocaleString()} stars in top matches`
        : `GitHub interest present (${items.length} repos) but low recent push activity`;

    return { score, summary, topRepos };
  } catch {
    return null;
  }
}

export async function probeGithub(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("https://api.github.com/rate_limit", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return { ok: true };
}
