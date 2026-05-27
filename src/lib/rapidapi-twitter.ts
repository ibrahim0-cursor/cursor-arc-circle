/**
 * Optional Twitter via RapidAPI — supplements Social Data API.
 * Configure host/path per your RapidAPI subscription.
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

function rapidHeaders(host: string): Record<string, string> | null {
  const key = cleanEnv(process.env.RAPIDAPI_KEY);
  if (!key) return null;
  return {
    "x-rapidapi-key": key,
    "x-rapidapi-host": host,
    "Content-Type": "application/json",
  };
}

export async function probeRapidApiTwitter(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasRapidApiTwitter()) {
    return { ok: false, configured: false, error: "RAPIDAPI_KEY + RAPIDAPI_TWITTER_HOST not set" };
  }
  const host = cleanEnv(process.env.RAPIDAPI_TWITTER_HOST)!;
  const headers = rapidHeaders(host);
  if (!headers) return { ok: false, configured: false };

  const path = cleanEnv(process.env.RAPIDAPI_TWITTER_PROBE_PATH) ?? "/get-users-v2";
  const users = cleanEnv(process.env.RAPIDAPI_TWITTER_PROBE_USERS) ?? "44196397";
  const url = new URL(`https://${host}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("users", users);

  try {
    const res = await fetch(url.toString(), { headers, cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (res.ok) return { ok: true, configured: true };
    return { ok: false, configured: true, error: `HTTP ${res.status}` };
  } catch {
    return { ok: false, configured: true, error: "request failed" };
  }
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

  const searchPath = cleanEnv(process.env.RAPIDAPI_TWITTER_SEARCH_PATH);
  if (searchPath) {
    const fromSearch = await rapidSearch(host, searchPath, q, max);
    if (fromSearch.length > 0) return fromSearch;
  }

  const altHost = cleanEnv(process.env.RAPIDAPI_TWITTER_HOST_ALT);
  if (altHost && altHost !== host) {
    const altPath = cleanEnv(process.env.RAPIDAPI_TWITTER_SEARCH_PATH_ALT) ?? "/search";
    const fromAlt = await rapidSearch(altHost, altPath, q, max);
    if (fromAlt.length > 0) return fromAlt;
  }

  return [];
}

async function rapidSearch(
  host: string,
  path: string,
  query: string,
  max: number,
): Promise<TwitterPulseItem[]> {
  const headers = rapidHeaders(host);
  if (!headers) return [];

  const url = new URL(`https://${host}${path.startsWith("/") ? path : `/${path}`}`);
  if (!url.searchParams.has("query")) url.searchParams.set("query", `${query} crypto`);
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", String(max));

  try {
    const res = await fetch(url.toString(), {
      headers,
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
  if (Array.isArray(json.users)) {
    for (const u of json.users) {
      if (u && typeof u === "object") {
        const o = u as Record<string, unknown>;
        const bio = typeof o.description === "string" ? o.description : "";
        const name = typeof o.name === "string" ? o.name : "";
        const screen =
          typeof o.screen_name === "string"
            ? o.screen_name
            : typeof o.username === "string"
              ? o.username
              : undefined;
        const text = [name, bio].filter(Boolean).join(" — ");
        if (text) candidates.push({ text, author: screen });
      }
    }
  }

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
          : typeof o.screen_name === "string"
            ? o.screen_name
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
