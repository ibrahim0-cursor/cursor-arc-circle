/**
 * Optional Twitter search via RapidAPI (paid) — not X scraping on Vercel.
 * Set RAPIDAPI_KEY + RAPIDAPI_TWITTER_HOST (from your RapidAPI subscription).
 */

export type TwitterPulseItem = {
  title: string;
  link?: string;
  author?: string;
};

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasRapidApiTwitter(): boolean {
  return Boolean(cleanEnv(process.env.RAPIDAPI_KEY) && cleanEnv(process.env.RAPIDAPI_TWITTER_HOST));
}

export async function probeRapidApiTwitter(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasRapidApiTwitter()) {
    return { ok: false, configured: false, error: "RAPIDAPI_KEY + RAPIDAPI_TWITTER_HOST not set" };
  }
  const items = await fetchRapidApiTwitterBuzz("BTC", 1);
  return items.length > 0
    ? { ok: true, configured: true }
    : { ok: false, configured: true, error: "search returned no results (check host/path)" };
}

export async function fetchRapidApiTwitterBuzz(
  topic: string,
  max = 4,
): Promise<TwitterPulseItem[]> {
  const key = cleanEnv(process.env.RAPIDAPI_KEY);
  const host = cleanEnv(process.env.RAPIDAPI_TWITTER_HOST);
  if (!key || !host) return [];

  const q = topic.replace(/^\$/, "").trim();
  if (q.length < 2) return [];

  const path =
    cleanEnv(process.env.RAPIDAPI_TWITTER_SEARCH_PATH) ?? "/search";
  const url = new URL(`https://${host}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("query", `${q} crypto`);
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", String(max));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": host,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return [];

    const json = (await res.json()) as Record<string, unknown>;
    const tweets = extractTweets(json);
    return tweets.slice(0, max).map((t) => ({
      title: t.text.slice(0, 200),
      link: t.url,
      author: t.user,
    }));
  } catch {
    return [];
  }
}

function extractTweets(json: Record<string, unknown>): Array<{ text: string; url?: string; user?: string }> {
  const candidates: unknown[] = [];
  if (Array.isArray(json.results)) candidates.push(...json.results);
  if (Array.isArray(json.data)) candidates.push(...json.data);
  if (Array.isArray(json.tweets)) candidates.push(...json.tweets);
  if (Array.isArray(json.timeline)) candidates.push(...json.timeline);

  const out: Array<{ text: string; url?: string; user?: string }> = [];
  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const text =
      (typeof o.text === "string" && o.text) ||
      (typeof o.full_text === "string" && o.full_text) ||
      (typeof o.tweet_text === "string" && o.tweet_text) ||
      "";
    if (!text) continue;
    const user =
      typeof o.user === "object" && o.user && typeof (o.user as { screen_name?: string }).screen_name === "string"
        ? (o.user as { screen_name: string }).screen_name
        : typeof o.author === "string"
          ? o.author
          : undefined;
    const id = typeof o.id === "string" || typeof o.id === "number" ? String(o.id) : undefined;
    out.push({
      text,
      user,
      url: user && id ? `https://x.com/${user}/status/${id}` : undefined,
    });
  }
  return out;
}
