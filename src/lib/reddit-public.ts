/**
 * Reddit public JSON endpoints (no OAuth).
 * https://www.reddit.com/r/{sub}/new.json · /search.json?q=
 */

import type { RedditPost } from "./reddit";

const DEFAULT_UA = "web:trader-arc:1.0 (by /u/arctrader114)";

function userAgent(): string {
  const raw = process.env.REDDIT_USER_AGENT ?? process.env.REDDIT_PUBLIC_USER_AGENT;
  const v = raw?.trim().replace(/^['"]|['"]$/g, "");
  return v && v.length > 0 ? v : DEFAULT_UA;
}

function mapListingChild(raw: Record<string, unknown>): RedditPost | null {
  const data = (raw.data ?? raw) as Record<string, unknown>;
  const title = String(data.title ?? "").trim();
  if (!title) return null;
  const permalink = String(data.permalink ?? "");
  return {
    id: String(data.id ?? ""),
    title,
    subreddit: String(data.subreddit ?? ""),
    author: String(data.author ?? "[deleted]"),
    score: Number(data.score ?? 0),
    numComments: Number(data.num_comments ?? 0),
    permalink: permalink.startsWith("http") ? permalink : `https://www.reddit.com${permalink}`,
    url: String(data.url ?? permalink),
    createdUtc: Number(data.created_utc ?? 0),
  };
}

async function fetchListing(url: string, limit: number): Promise<RedditPost[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { children?: Array<{ data?: Record<string, unknown> }> };
    };
    return (json.data?.children ?? [])
      .map((c) => mapListingChild(c.data ?? {}))
      .filter((p): p is RedditPost => p !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function redditPublicSubredditNew(
  subreddit: string,
  limit = 5,
): Promise<RedditPost[]> {
  const sub = subreddit.replace(/^r\//i, "").trim() || "CryptoCurrency";
  return fetchListing(
    `https://www.reddit.com/r/${encodeURIComponent(sub)}/new.json?limit=${Math.min(limit, 25)}`,
    limit,
  );
}

export async function redditPublicSearch(query: string, limit = 5): Promise<RedditPost[]> {
  const q = query.trim() || "crypto";
  const params = new URLSearchParams({
    q,
    limit: String(Math.min(limit, 25)),
    sort: "relevance",
    t: "week",
  });
  return fetchListing(`https://www.reddit.com/search.json?${params}`, limit);
}

/** Token-aware: subreddit new + search fallback */
export async function redditPublicForToken(symbol: string, limit = 4): Promise<RedditPost[]> {
  const sym = symbol.replace(/^\$/, "").trim();
  const sub = ["pepe", "doge", "shib", "bonk", "wif", "floki"].some((m) =>
    sym.toLowerCase().includes(m),
  )
    ? "CryptoMoonShots"
    : "CryptoCurrency";

  const fromSub = await redditPublicSubredditNew(sub, limit);
  if (fromSub.length >= 2) {
    const needle = sym.toLowerCase();
    const matched = fromSub.filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.title.toLowerCase().includes(sym.toLowerCase()),
    );
    return (matched.length > 0 ? matched : fromSub).slice(0, limit);
  }

  const searched = await redditPublicSearch(`${sym} crypto`, limit);
  return searched.length > 0 ? searched : fromSub;
}

export async function probeRedditPublic(): Promise<{
  ok: boolean;
  configured: boolean;
  error?: string;
}> {
  const posts = await redditPublicSubredditNew("CryptoCurrency", 1);
  if (posts.length > 0) return { ok: true, configured: true };
  return { ok: false, configured: true, error: "empty or blocked — check User-Agent" };
}
