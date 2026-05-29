/**
 * Shared 6551 REST client (OpenNews + OpenTwitter).
 * https://6551.io/mcp · Base: https://ai.6551.io
 */

import { parse6551ErrorMessage } from "./6551-errors";

const DEFAULT_BASE = "https://ai.6551.io";

export function clean6551Token(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export type Resolve6551TokenSource =
  | "OPENNEWS_TOKEN"
  | "TWITTER_TOKEN"
  | "API_KEY_6551"
  | "6551_API_KEY"
  | null;

/** Which Vercel env var wins for probes (no secret values). */
export function resolve6551TokenSource(role: "opennews" | "twitter"): Resolve6551TokenSource {
  if (role === "opennews" && clean6551Token(process.env.OPENNEWS_TOKEN)) return "OPENNEWS_TOKEN";
  if (role === "twitter" && clean6551Token(process.env.TWITTER_TOKEN)) return "TWITTER_TOKEN";
  if (clean6551Token(process.env.API_KEY_6551)) return "API_KEY_6551";
  if (clean6551Token(process.env["6551_API_KEY"])) return "6551_API_KEY";
  if (clean6551Token(process.env.OPENNEWS_TOKEN)) return "OPENNEWS_TOKEN";
  if (clean6551Token(process.env.TWITTER_TOKEN)) return "TWITTER_TOKEN";
  return null;
}

/** One 6551 account key often powers both OpenNews and OpenTwitter REST routes. */
export function resolve6551Token(role: "opennews" | "twitter"): string | undefined {
  const source = resolve6551TokenSource(role);
  if (!source) return undefined;
  if (source === "OPENNEWS_TOKEN") return clean6551Token(process.env.OPENNEWS_TOKEN);
  if (source === "TWITTER_TOKEN") return clean6551Token(process.env.TWITTER_TOKEN);
  if (source === "API_KEY_6551") return clean6551Token(process.env.API_KEY_6551);
  return clean6551Token(process.env["6551_API_KEY"]);
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
      return {
        ok: false,
        error: parse6551ErrorMessage(text.slice(0, 400) || `HTTP ${res.status}`),
        status: res.status,
      };
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
