/**
 * Hacker News — Algolia search API (free, no key).
 * https://hn.algolia.com/api · https://github.com/HackerNews/API
 */

export type HackerNewsHit = {
  objectID: string;
  title: string;
  url?: string;
  points: number;
  numComments: number;
  author: string;
  createdAt: string;
  storyUrl: string;
};

export async function searchHackerNews(query: string, hitsPerPage = 5): Promise<HackerNewsHit[]> {
  const q = query.trim() || "crypto";
  const params = new URLSearchParams({
    query: q,
    tags: "story",
    hitsPerPage: String(Math.min(hitsPerPage, 20)),
  });

  try {
    const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      hits?: Array<{
        objectID?: string;
        title?: string;
        url?: string;
        points?: number;
        num_comments?: number;
        author?: string;
        created_at?: string;
        story_url?: string;
      }>;
    };

    const out: HackerNewsHit[] = [];
    for (const h of json.hits ?? []) {
      const title = String(h.title ?? "").trim();
      if (!title) continue;
      const id = String(h.objectID ?? "");
      out.push({
        objectID: id,
        title,
        url: h.url,
        points: Number(h.points ?? 0),
        numComments: Number(h.num_comments ?? 0),
        author: String(h.author ?? ""),
        createdAt: String(h.created_at ?? ""),
        storyUrl: h.story_url ?? `https://news.ycombinator.com/item?id=${id}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchHackerNewsForToken(symbol: string, name?: string): Promise<HackerNewsHit[]> {
  const sym = symbol.replace(/^\$/, "").trim();
  const q = name && name.length > 3 ? `${sym} ${name.split(/\s+/)[0]}` : sym;
  const hits = await searchHackerNews(q, 5);
  if (hits.length > 0) return hits;
  if (/btc|bitcoin/i.test(sym)) return searchHackerNews("bitcoin", 4);
  if (/eth/i.test(sym)) return searchHackerNews("ethereum", 4);
  return searchHackerNews(`${sym} cryptocurrency`, 4);
}

export async function probeHackerNews(): Promise<{ ok: boolean; error?: string }> {
  const hits = await searchHackerNews("bitcoin", 1);
  if (hits.length > 0) return { ok: true };
  return { ok: false, error: "no hits" };
}
