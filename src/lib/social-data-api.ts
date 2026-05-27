/**
 * Social Data API (socialdata.tools) — Twitter/X search for narrative velocity.
 * Set SOCIAL_DATA_API_KEY (format: id|token from dashboard).
 */

const BASE = "https://api.socialdata.tools";

export type SocialDataTweet = {
  id: string;
  text: string;
  author?: string;
  createdAt?: string;
  url?: string;
};

function cleanKey(raw?: string): string | undefined {
  const v = raw?.trim().replace(/^['"]|['"]$/g, "");
  return v && v.includes("|") ? v : v && v.length >= 12 ? v : undefined;
}

export function hasSocialDataKey(): boolean {
  return Boolean(cleanKey(process.env.SOCIAL_DATA_API_KEY) ?? cleanKey(process.env.SOCIALDATA_API_KEY));
}

function authHeader(): Record<string, string> | null {
  const key = cleanKey(process.env.SOCIAL_DATA_API_KEY) ?? cleanKey(process.env.SOCIALDATA_API_KEY);
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

export async function probeSocialData(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasSocialDataKey()) {
    return { ok: false, configured: false, error: "SOCIAL_DATA_API_KEY not set" };
  }
  const tweets = await searchSocialDataTweets("bitcoin", 1);
  return tweets.length > 0
    ? { ok: true, configured: true }
    : { ok: false, configured: true, error: "search returned empty" };
}

export async function searchSocialDataTweets(
  query: string,
  limit = 5,
): Promise<SocialDataTweet[]> {
  const headers = authHeader();
  if (!headers) return [];

  const q = query.replace(/^\$/, "").trim();
  if (q.length < 2) return [];

  try {
    const params = new URLSearchParams({
      query: q.length <= 6 ? `${q} crypto` : q,
      limit: String(Math.min(25, Math.max(1, limit))),
    });
    const res = await fetch(`${BASE}/twitter/search?${params}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      tweets?: Array<{
        id?: number | string;
        id_str?: string;
        full_text?: string;
        text?: string;
        tweet_created_at?: string;
        user?: { screen_name?: string; name?: string };
      }>;
    };

    const tweets = json.tweets ?? [];
    return tweets
      .map((t) => {
        const text = (t.full_text ?? t.text ?? "").trim();
        if (!text || text.length < 8) return null;
        const author = t.user?.screen_name;
        const id = String(t.id_str ?? t.id ?? "");
        return {
          id,
          text: text.slice(0, 220),
          author,
          createdAt: t.tweet_created_at,
          url: author && id ? `https://x.com/${author}/status/${id}` : undefined,
        } satisfies SocialDataTweet;
      })
      .filter(Boolean) as SocialDataTweet[];
  } catch {
    return [];
  }
}
