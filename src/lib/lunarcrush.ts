/** LunarCrush API v4 — social metrics for crypto tokens. */

const DEFAULT_BASE = "https://lunarcrush.com/api4";

export type LunarCrushResult<T> = {
  data: T | null;
  reason?: string;
};

export type LunarCrushCoinSnapshot = {
  symbol: string;
  name?: string;
  galaxyScore?: number;
  altRank?: number;
  socialVolume24h?: number;
  sentiment?: number;
  interactions24h?: number;
  socialDominance?: number;
  contributors?: number;
  topic?: string;
};

export type LunarCrushTopicSummary = {
  topic: string;
  title?: string;
  galaxyScore?: number;
  sentiment?: number;
  socialDominance?: number;
  numPosts?: number;
  contributors?: number;
  interactionsPerPost?: number;
};

export type LunarCrushTopicPost = {
  title: string;
  url?: string;
  network?: string;
  interactions?: number;
};

export type LunarCrushProbeResult = {
  ok: boolean;
  configured: boolean;
  paidRequired?: boolean;
  error?: string;
};

function cleanKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().replace(/^['"]|['"]$/g, "");
  return key.length >= 8 ? key : undefined;
}

function baseUrl(): string {
  const custom = process.env.LUNARCRUSH_API_BASE?.trim();
  return custom || DEFAULT_BASE;
}

export function hasLunarCrushKey(): boolean {
  return Boolean(cleanKey(process.env.LUNARCRUSH_API_KEY));
}

async function lunarFetch<T>(
  path: string,
): Promise<{ ok: boolean; status: number; data: T | null; paidRequired?: boolean; reason?: string }> {
  const key = cleanKey(process.env.LUNARCRUSH_API_KEY);
  if (!key) return { ok: false, status: 0, data: null, reason: "missing LUNARCRUSH_API_KEY" };

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 402) {
      return {
        ok: false,
        status: 402,
        data: null,
        paidRequired: true,
        reason: "402 Payment Required — Individual or higher subscription needed",
      };
    }

    if (res.status === 401) {
      return { ok: false, status: 401, data: null, reason: "401 Unauthorized — invalid LunarCrush API key" };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, data: null, reason: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null, reason: "network error" };
  }
}

function normalizeSymbol(symbol: string): string {
  return symbol.replace(/^\$/, "").trim().toLowerCase();
}

function unwrapRow<T extends Record<string, unknown>>(payload: T | { data?: T }): T | null {
  const row = (payload as { data?: T }).data ?? payload;
  if (!row || typeof row !== "object") return null;
  return row as T;
}

/** Coin-level social snapshot (galaxy score, alt rank, volume). */
export async function getCoinTopic(symbol: string): Promise<LunarCrushResult<LunarCrushCoinSnapshot>> {
  if (!hasLunarCrushKey()) return { data: null, reason: "missing LUNARCRUSH_API_KEY" };

  const coin = encodeURIComponent(normalizeSymbol(symbol));
  const res = await lunarFetch<Record<string, unknown>>(`/public/coins/${coin}/v1`);
  if (res.paidRequired || res.reason) return { data: null, reason: res.reason };
  if (!res.ok || !res.data) return { data: null, reason: res.reason ?? "empty response" };

  const row = unwrapRow(res.data);
  if (!row) return { data: null, reason: "empty response" };

  return {
    data: {
      symbol: String(row.symbol ?? symbol).toUpperCase(),
      name: row.name ? String(row.name) : undefined,
      galaxyScore: row.galaxy_score != null ? Number(row.galaxy_score) : undefined,
      altRank: row.alt_rank != null ? Number(row.alt_rank) : undefined,
      socialVolume24h: row.social_volume_24h != null ? Number(row.social_volume_24h) : undefined,
      sentiment: row.sentiment != null ? Number(row.sentiment) : undefined,
      interactions24h: row.interactions_24h != null ? Number(row.interactions_24h) : undefined,
      socialDominance: row.social_dominance != null ? Number(row.social_dominance) : undefined,
      contributors: row.num_contributors != null ? Number(row.num_contributors) : undefined,
      topic: row.topic ? String(row.topic) : normalizeSymbol(symbol),
    },
  };
}

/** 24h topic summary — sentiment, posts, galaxy score. */
export async function getTopicSummary(topic: string): Promise<LunarCrushResult<LunarCrushTopicSummary>> {
  if (!hasLunarCrushKey()) return { data: null, reason: "missing LUNARCRUSH_API_KEY" };

  const t = encodeURIComponent(normalizeSymbol(topic));
  const res = await lunarFetch<Record<string, unknown>>(`/public/topic/${t}/v1`);
  if (res.paidRequired || res.reason) return { data: null, reason: res.reason };
  if (!res.ok || !res.data) return { data: null, reason: res.reason ?? "empty response" };

  const row = unwrapRow(res.data);
  if (!row) return { data: null, reason: "empty response" };

  return {
    data: {
      topic: String(row.topic ?? topic).toLowerCase(),
      title: row.title ? String(row.title) : undefined,
      galaxyScore: row.galaxy_score != null ? Number(row.galaxy_score) : undefined,
      sentiment: row.sentiment != null ? Number(row.sentiment) : undefined,
      socialDominance: row.social_dominance != null ? Number(row.social_dominance) : undefined,
      numPosts: row.num_posts != null ? Number(row.num_posts) : undefined,
      contributors: row.num_contributors != null ? Number(row.num_contributors) : undefined,
      interactionsPerPost:
        row.interactions_per_post != null ? Number(row.interactions_per_post) : undefined,
    },
  };
}

/** Top posts for a social topic. */
export async function getTopicPosts(topic: string, limit = 3): Promise<LunarCrushResult<LunarCrushTopicPost[]>> {
  if (!hasLunarCrushKey()) return { data: [], reason: "missing LUNARCRUSH_API_KEY" };

  const t = encodeURIComponent(normalizeSymbol(topic));
  const res = await lunarFetch<{ data?: Array<Record<string, unknown>> }>(
    `/public/topic/${t}/posts/v1?limit=${Math.min(limit, 10)}`,
  );
  if (res.paidRequired || res.reason) return { data: [], reason: res.reason };
  if (!res.ok || !res.data) return { data: [], reason: res.reason ?? "empty response" };

  const rows = (res.data as { data?: Array<Record<string, unknown>> }).data ?? [];
  return {
    data: rows.slice(0, limit).map((p) => ({
      title: String(p.post_title ?? p.title ?? p.text ?? "Social post"),
      url: p.post_link ? String(p.post_link) : p.url ? String(p.url) : undefined,
      network: p.network ? String(p.network) : undefined,
      interactions: p.interactions_24h != null ? Number(p.interactions_24h) : undefined,
    })),
  };
}

/** Back-compat aliases used elsewhere in the app. */
export const fetchLunarCrushCoin = async (symbol: string) => {
  const result = await getCoinTopic(symbol);
  return {
    snapshot: result.data,
    paidRequired: result.reason?.includes("402"),
  };
};

export const fetchLunarCrushTopicPosts = async (topic: string, limit = 3) => {
  const result = await getTopicPosts(topic, limit);
  return result.data ?? [];
};

export async function probeLunarCrush(): Promise<LunarCrushProbeResult> {
  if (!hasLunarCrushKey()) {
    return { ok: false, configured: false, error: "missing LUNARCRUSH_API_KEY" };
  }

  const res = await lunarFetch<{ data?: unknown[] }>("/public/coins/list/v1?limit=1");
  if (res.paidRequired) {
    return {
      ok: false,
      configured: true,
      paidRequired: true,
      error: res.reason ?? "402 Payment Required — subscription needed for API access",
    };
  }
  if (res.status === 401) {
    return { ok: false, configured: true, error: res.reason ?? "401 Unauthorized" };
  }
  if (res.ok) return { ok: true, configured: true };
  return { ok: false, configured: true, error: res.reason ?? `HTTP ${res.status || "network error"}` };
}
