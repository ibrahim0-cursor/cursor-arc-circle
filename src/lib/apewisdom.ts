/**
 * ApeWisdom — Reddit / 4chan mention ranks (free, no key).
 * https://apewisdom.io/api/v1.0/filter/{filter}
 */

export type ApeWisdomFilter = "all" | "all-stocks" | "all-crypto";

export type ApeWisdomRow = {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rank24hAgo?: number;
  mentions24hAgo?: number;
};

type ApiRow = {
  rank?: string | number;
  ticker?: string;
  name?: string;
  mentions?: string | number;
  upvotes?: string | number;
  rank_24h_ago?: string | number;
  mentions_24h_ago?: string | number;
};

const BASE = "https://apewisdom.io/api/v1.0/filter";

let cache: { at: number; filter: ApeWisdomFilter; map: Map<string, ApeWisdomRow> } | null = null;
const CACHE_MS = 5 * 60 * 1000;

function num(v: string | number | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(raw: ApiRow): ApeWisdomRow | null {
  const ticker = String(raw.ticker ?? "").trim().toUpperCase();
  if (!ticker) return null;
  return {
    rank: num(raw.rank),
    ticker,
    name: String(raw.name ?? ticker),
    mentions: num(raw.mentions),
    upvotes: num(raw.upvotes),
    rank24hAgo: raw.rank_24h_ago != null ? num(raw.rank_24h_ago) : undefined,
    mentions24hAgo: raw.mentions_24h_ago != null ? num(raw.mentions_24h_ago) : undefined,
  };
}

export async function fetchApeWisdomPage(
  filter: ApeWisdomFilter = "all-crypto",
  page = 1,
): Promise<{ rows: ApeWisdomRow[]; pages: number; count: number }> {
  const path = page > 1 ? `${BASE}/${filter}/page/${page}` : `${BASE}/${filter}`;
  try {
    const res = await fetch(path, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return { rows: [], pages: 0, count: 0 };
    }
    const json = (await res.json()) as {
      results?: ApiRow[];
      pages?: number;
      count?: number;
    };
    const rows = (json.results ?? [])
      .map(mapRow)
      .filter((r): r is ApeWisdomRow => r !== null);
    return {
      rows,
      pages: num(json.pages),
      count: num(json.count),
    };
  } catch {
    return { rows: [], pages: 0, count: 0 };
  }
}

/** Cached mention map: ticker → row (pages 1–2 for alpha). */
export async function getApeWisdomMentionMap(
  filter: ApeWisdomFilter = "all-crypto",
  maxPages = 2,
): Promise<Map<string, ApeWisdomRow>> {
  if (cache && cache.filter === filter && Date.now() - cache.at < CACHE_MS) {
    return cache.map;
  }

  const map = new Map<string, ApeWisdomRow>();
  for (let page = 1; page <= maxPages; page++) {
    const { rows, pages } = await fetchApeWisdomPage(filter, page);
    for (const row of rows) {
      map.set(row.ticker, row);
    }
    if (page >= pages || rows.length === 0) break;
  }

  cache = { at: Date.now(), filter, map };
  return map;
}

export function lookupApeWisdom(symbol: string, map: Map<string, ApeWisdomRow>): ApeWisdomRow | undefined {
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  if (!sym) return undefined;
  return map.get(sym) ?? map.get(sym.split(/[^A-Z0-9]/)[0] ?? "");
}

export async function probeApeWisdom(): Promise<{ ok: boolean; error?: string; count?: number }> {
  const { rows, count } = await fetchApeWisdomPage("all-crypto", 1);
  if (rows.length > 0) return { ok: true, count };
  return { ok: false, error: "empty response", count };
}
