/**
 * 6551 OpenTwitter — X/Twitter search and KOL data.
 * CLI/MCP: npx skills add 6551Team/opentwitter-mcp · Env: TWITTER_TOKEN
 */

import { fetch6551, resolve6551Token, resolve6551TokenSource } from "./6551-client";

export type OpenTwitterHit = {
  text: string;
  author?: string;
  url?: string;
  likes?: number;
  retweets?: number;
};

type TweetRow = {
  text?: string;
  id?: string;
  userScreenName?: string;
  screenName?: string;
  favoriteCount?: number;
  retweetCount?: number;
  urls?: Array<{ url?: string; expandedUrl?: string }>;
};

export function hasOpenTwitterToken(): boolean {
  return Boolean(resolve6551Token("twitter"));
}

function token(): string | null {
  return resolve6551Token("twitter") ?? null;
}

function normalizeTweets(data: unknown): TweetRow[] {
  if (Array.isArray(data)) return data as TweetRow[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.list)) return d.list as TweetRow[];
    if (Array.isArray(d.tweets)) return d.tweets as TweetRow[];
    if (Array.isArray(d.data)) return d.data as TweetRow[];
  }
  return [];
}

export function mapOpenTwitterRows(rows: TweetRow[]): OpenTwitterHit[] {
  const out: OpenTwitterHit[] = [];
  for (const r of rows) {
    const text = String(r.text ?? "").trim();
    if (!text) continue;
    const author = r.userScreenName ?? r.screenName;
    const url =
      r.id && author
        ? `https://x.com/${author}/status/${r.id}`
        : r.urls?.[0]?.expandedUrl ?? r.urls?.[0]?.url;
    out.push({
      text: text.slice(0, 280),
      author: author ? String(author) : undefined,
      url: url ? String(url) : undefined,
      likes: r.favoriteCount,
      retweets: r.retweetCount,
    });
  }
  return out;
}

export async function searchOpenTwitter(opts: {
  keywords?: string;
  hashtag?: string;
  minLikes?: number;
  maxResults?: number;
  product?: "Top" | "Latest";
}): Promise<OpenTwitterHit[]> {
  const t = token();
  if (!t) return [];

  const res = await fetch6551<unknown>("/open/twitter_search", t, {
    ...(opts.keywords ? { keywords: opts.keywords } : {}),
    ...(opts.hashtag ? { hashtag: opts.hashtag } : {}),
    minLikes: opts.minLikes ?? 0,
    maxResults: Math.min(100, Math.max(1, opts.maxResults ?? 15)),
    product: opts.product ?? "Top",
    excludeReplies: true,
    excludeRetweets: false,
  });

  if (!res.ok) return [];
  return mapOpenTwitterRows(normalizeTweets(res.data));
}

export async function fetchOpenTwitterForToken(symbol: string, name?: string, limit = 6): Promise<OpenTwitterHit[]> {
  const sym = symbol.replace(/^\$/, "").trim();
  const keywords = [sym, name?.trim(), `${sym} crypto`].filter(Boolean).join(" ");
  return searchOpenTwitter({ keywords, minLikes: 5, maxResults: limit, product: "Latest" });
}

export async function probeOpenTwitter(): Promise<{
  ok: boolean;
  configured: boolean;
  tokenSource?: string;
  error?: string;
}> {
  if (!hasOpenTwitterToken()) {
    return { ok: false, configured: false, error: "6551 key not set (API_KEY_6551 or TWITTER_TOKEN)" };
  }
  const t = token();
  if (!t) return { ok: false, configured: false, error: "6551 key not set" };
  const tokenSource = resolve6551TokenSource("twitter") ?? undefined;
  const res = await fetch6551<unknown>("/open/twitter_search", t, {
    keywords: "bitcoin",
    maxResults: 1,
    minLikes: 0,
    product: "Latest",
  });
  if (!res.ok) {
    return { ok: false, configured: true, tokenSource, error: res.error ?? `HTTP ${res.status}` };
  }
  const parsed = mapOpenTwitterRows(normalizeTweets(res.data));
  if (parsed.length > 0) return { ok: true, configured: true, tokenSource };
  return {
    ok: false,
    configured: true,
    tokenSource,
    error: "twitter_search returned no rows (check 6551 plan / OpenTwitter access)",
  };
}
