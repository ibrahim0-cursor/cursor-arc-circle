/**
 * Shared 6551 REST client (OpenNews + OpenTwitter).
 * https://6551.io/mcp · Base: https://ai.6551.io
 */

const DEFAULT_BASE = "https://ai.6551.io";

export function clean6551Token(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

/** One 6551 account key often powers both OpenNews and OpenTwitter REST routes. */
export function resolve6551Token(role: "opennews" | "twitter"): string | undefined {
  const primary =
    role === "opennews"
      ? clean6551Token(process.env.OPENNEWS_TOKEN)
      : clean6551Token(process.env.TWITTER_TOKEN);
  if (primary) return primary;

  const shared =
    clean6551Token(process.env.API_KEY_6551) ??
    clean6551Token(process.env["6551_API_KEY"]) ??
    clean6551Token(process.env.OPENNEWS_TOKEN) ??
    clean6551Token(process.env.TWITTER_TOKEN);
  return shared;
}

export function has6551Token(): boolean {
  return Boolean(resolve6551Token("opennews") ?? resolve6551Token("twitter"));
}

export function base6551Url(): string {
  return clean6551Token(process.env.OPENNEWS_API_BASE) ?? DEFAULT_BASE;
}

export async function fetch6551<T>(
  path: string,
  token: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const url = `${base6551Url()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(18_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: text.slice(0, 200) || `HTTP ${res.status}`, status: res.status };
    }
    const json = JSON.parse(text) as { data?: T; code?: number; msg?: string };
    if (json.code !== undefined && json.code !== 0) {
      return { ok: false, error: json.msg ?? `6551 code ${json.code}`, status: res.status };
    }
    const payload = (json.data ?? json) as T;
    return { ok: true, data: payload, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "6551 request failed",
      status: 0,
    };
  }
}
