/** Reddit Data API (OAuth) — external Next.js read-only client. NOT Devvit. */

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const OAUTH_BASE = "https://oauth.reddit.com";

export type RedditPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  permalink: string;
  url: string;
  createdUtc: number;
};

export type RedditProbeResult = {
  ok: boolean;
  configured: boolean;
  error?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasRedditCredentials(): boolean {
  return Boolean(
    cleanEnv(process.env.REDDIT_CLIENT_ID) &&
      cleanEnv(process.env.REDDIT_CLIENT_SECRET) &&
      cleanEnv(process.env.REDDIT_USER_AGENT),
  );
}

function redditUserAgent(): string {
  return cleanEnv(process.env.REDDIT_USER_AGENT) ?? "web:trader-arc:1.0 (by /u/traderarc)";
}

async function getAccessToken(): Promise<string | null> {
  if (!hasRedditCredentials()) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.value;
  }

  const clientId = cleanEnv(process.env.REDDIT_CLIENT_ID)!;
  const clientSecret = cleanEnv(process.env.REDDIT_CLIENT_SECRET)!;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": redditUserAgent(),
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!res.ok) {
      cachedToken = null;
      return null;
    }

    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    cachedToken = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
    return cachedToken.value;
  } catch {
    cachedToken = null;
    return null;
  }
}

function mapPost(raw: Record<string, unknown>): RedditPost | null {
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
    permalink: permalink.startsWith("http") ? permalink : `https://reddit.com${permalink}`,
    url: String(data.url ?? permalink),
    createdUtc: Number(data.created_utc ?? 0),
  };
}

export async function searchSubredditPosts(
  subreddit: string,
  query: string,
  limit = 5,
): Promise<RedditPost[]> {
  if (!hasRedditCredentials()) return [];

  const token = await getAccessToken();
  if (!token) return [];

  const sub = subreddit.replace(/^r\//i, "").trim() || "CryptoCurrency";
  const params = new URLSearchParams({
    q: query.trim() || sub,
    restrict_sr: "1",
    sort: "relevance",
    t: "week",
    limit: String(Math.min(Math.max(limit, 1), 25)),
  });

  try {
    const res = await fetch(`${OAUTH_BASE}/r/${encodeURIComponent(sub)}/search?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": redditUserAgent(),
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: { children?: Array<{ data?: Record<string, unknown> }> } };
    return (json.data?.children ?? [])
      .map((c) => mapPost(c.data ?? {}))
      .filter((p): p is RedditPost => p !== null);
  } catch {
    return [];
  }
}

export async function probeReddit(): Promise<RedditProbeResult> {
  if (!hasRedditCredentials()) {
    return { ok: false, configured: false, error: "missing REDDIT_CLIENT_ID/SECRET/USER_AGENT" };
  }

  const posts = await searchSubredditPosts("CryptoCurrency", "bitcoin", 1);
  if (posts.length > 0) return { ok: true, configured: true };

  const token = await getAccessToken();
  if (!token) {
    return { ok: false, configured: true, error: "OAuth token request failed — check credentials" };
  }

  return { ok: true, configured: true };
}
