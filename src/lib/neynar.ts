/** Neynar — Farcaster / Snapchain read-only client. */

const DEFAULT_SNAPCHAIN_BASE = "https://snapchain-api.neynar.com";
const NEYNAR_BASE = "https://api.neynar.com";

export type NeynarCastHit = {
  hash: string;
  text: string;
  authorUsername?: string;
  authorDisplayName?: string;
  timestamp?: string;
  likes?: number;
  recasts?: number;
  replies?: number;
  url?: string;
};

export type NeynarCastSearchResult = {
  casts: NeynarCastHit[];
  reason?: string;
  paymentRequired?: boolean;
};

export type NeynarProbeResult = {
  ok: boolean;
  configured: boolean;
  error?: string;
  hubVersion?: string;
};

function cleanKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().replace(/^['"]|['"]$/g, "");
  return key.length >= 8 ? key : undefined;
}

function snapchainBase(): string {
  const custom = process.env.NEYNAR_API_BASE?.trim();
  return custom || DEFAULT_SNAPCHAIN_BASE;
}

export function hasNeynarKey(): boolean {
  return Boolean(cleanKey(process.env.NEYNAR_API_KEY));
}

export function neynarSearchEnabled(): boolean {
  const flag = process.env.NEYNAR_USE_SEARCH?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

function neynarHeaders(): HeadersInit {
  return {
    "x-api-key": cleanKey(process.env.NEYNAR_API_KEY)!,
    Accept: "application/json",
  };
}

export async function probeNeynar(): Promise<NeynarProbeResult> {
  if (!hasNeynarKey()) {
    return { ok: false, configured: false, error: "missing NEYNAR_API_KEY" };
  }

  try {
    const res = await fetch(`${snapchainBase()}/v1/info`, {
      headers: neynarHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, configured: true, error: `Snapchain /v1/info HTTP ${res.status}` };
    }

    const json = (await res.json()) as { version?: string; hubVersion?: string };
    return {
      ok: true,
      configured: true,
      hubVersion: json.version ?? json.hubVersion,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : "Snapchain probe failed",
    };
  }
}

/** Cast keyword search via api.neynar.com — gated by NEYNAR_USE_SEARCH=true (paid tier). */
export async function getCastsForKeyword(query: string, limit = 5): Promise<NeynarCastSearchResult> {
  if (!hasNeynarKey() || !query.trim()) {
    return { casts: [], reason: "missing NEYNAR_API_KEY" };
  }

  if (!neynarSearchEnabled()) {
    return { casts: [], reason: "cast search disabled — set NEYNAR_USE_SEARCH=true" };
  }

  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(Math.min(Math.max(limit, 1), 25)),
  });

  try {
    const res = await fetch(`${NEYNAR_BASE}/v2/farcaster/cast/search?${params}`, {
      headers: neynarHeaders(),
      cache: "no-store",
    });

    if (res.status === 402 || res.status === 403) {
      return {
        casts: [],
        paymentRequired: true,
        reason: `${res.status} Payment Required — Neynar cast search needs a paid plan`,
      };
    }

    if (!res.ok) {
      return { casts: [], reason: `HTTP ${res.status}` };
    }

    const json = (await res.json()) as {
      casts?: Array<{
        hash?: string;
        text?: string;
        timestamp?: string;
        author?: { username?: string; display_name?: string };
        reactions?: { likes_count?: number; recasts_count?: number; replies_count?: number };
      }>;
    };

    return {
      casts: (json.casts ?? []).slice(0, limit).map((c) => ({
        hash: c.hash ?? "",
        text: (c.text ?? "").slice(0, 280),
        authorUsername: c.author?.username,
        authorDisplayName: c.author?.display_name,
        timestamp: c.timestamp,
        likes: c.reactions?.likes_count,
        recasts: c.reactions?.recasts_count,
        replies: c.reactions?.replies_count,
        url:
          c.hash && c.author?.username
            ? `https://warpcast.com/${c.author.username}/${c.hash.slice(0, 10)}`
            : undefined,
      })),
    };
  } catch {
    return { casts: [], reason: "network error" };
  }
}

/** Back-compat alias. */
export async function searchNeynarCasts(query: string, limit = 5): Promise<NeynarCastHit[]> {
  const result = await getCastsForKeyword(query, limit);
  return result.casts;
}
