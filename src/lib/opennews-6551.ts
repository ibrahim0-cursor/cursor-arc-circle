/**
 * 6551 OpenNews — crypto news with AI impact scores.
 * CLI/MCP: npx skills add 6551Team/opennews-mcp · Env: OPENNEWS_TOKEN
 */

import { fetch6551, resolve6551Token, resolve6551TokenSource } from "./6551-client";

export type OpenNewsItem = {
  title: string;
  source: string;
  link?: string;
  signal?: string;
  newsType?: string;
  coins?: string[];
  aiScore?: number;
};

type NewsRow = {
  text?: string;
  title?: string;
  source?: string;
  url?: string;
  link?: string;
  newsType?: string;
  aiRating?: { signal?: string; score?: number };
  coins?: string[];
};

export function hasOpenNewsToken(): boolean {
  return Boolean(resolve6551Token("opennews"));
}

function token(): string | null {
  return resolve6551Token("opennews") ?? null;
}

function normalizeRows(data: unknown): NewsRow[] {
  if (Array.isArray(data)) return data as NewsRow[];
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.list)) return d.list as NewsRow[];
    if (Array.isArray(d.items)) return d.items as NewsRow[];
    if (Array.isArray(d.data)) return d.data as NewsRow[];
  }
  return [];
}

export function mapOpenNewsRows(rows: NewsRow[]): OpenNewsItem[] {
  const out: OpenNewsItem[] = [];
  for (const r of rows) {
    const title = String(r.text ?? r.title ?? "").trim();
    if (!title) continue;
    out.push({
      title: title.slice(0, 280),
      source: String(r.source ?? "6551 OpenNews"),
      link: r.url ? String(r.url) : r.link ? String(r.link) : undefined,
      signal: r.aiRating?.signal ? String(r.aiRating.signal) : undefined,
      newsType: r.newsType ? String(r.newsType) : undefined,
      coins: Array.isArray(r.coins) ? r.coins.map(String) : undefined,
      aiScore: typeof r.aiRating?.score === "number" ? r.aiRating.score : undefined,
    });
  }
  return out;
}

export async function searchOpenNews(opts: {
  q?: string;
  coins?: string[];
  limit?: number;
  page?: number;
  hasCoin?: boolean;
}): Promise<OpenNewsItem[]> {
  const t = token();
  if (!t) return [];

  const res = await fetch6551<unknown>("/open/news_search", t, {
    limit: Math.min(100, Math.max(1, opts.limit ?? 10)),
    page: opts.page ?? 1,
    ...(opts.q ? { q: opts.q } : {}),
    ...(opts.coins?.length ? { coins: opts.coins } : {}),
    ...(opts.hasCoin ? { hasCoin: true } : {}),
  });

  if (!res.ok) return [];
  return mapOpenNewsRows(normalizeRows(res.data));
}

export async function fetchOpenNewsForSymbol(symbol: string, name?: string, limit = 6): Promise<OpenNewsItem[]> {
  const sym = symbol.replace(/^\$/, "").trim().toUpperCase();
  const coins = sym.length <= 10 ? [sym] : [];
  const q = [sym, name?.trim()].filter(Boolean).join(" OR ");

  const [byCoin, byQuery] = await Promise.all([
    coins.length ? searchOpenNews({ coins, limit, hasCoin: true }) : Promise.resolve([]),
    searchOpenNews({ q, limit }),
  ]);

  const seen = new Set<string>();
  const out: OpenNewsItem[] = [];
  for (const item of [...byCoin, ...byQuery]) {
    const k = item.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchOpenNewsMacro(query: string, limit = 8): Promise<OpenNewsItem[]> {
  return searchOpenNews({ q: query, limit });
}

export async function probeOpenNews(): Promise<{
  ok: boolean;
  configured: boolean;
  tokenSource?: string;
  error?: string;
}> {
  if (!hasOpenNewsToken()) {
    return { ok: false, configured: false, error: "6551 key not set (API_KEY_6551 or OPENNEWS_TOKEN)" };
  }
  const t = token();
  if (!t) return { ok: false, configured: false, error: "6551 key not set" };
  const tokenSource = resolve6551TokenSource("opennews") ?? undefined;
  const res = await fetch6551<unknown>("/open/news_search", t, { q: "bitcoin", limit: 1, page: 1 });
  if (!res.ok) {
    return { ok: false, configured: true, tokenSource, error: res.error ?? `HTTP ${res.status}` };
  }
  const rows = mapOpenNewsRows(normalizeRows(res.data));
  if (rows.length > 0) return { ok: true, configured: true, tokenSource };
  return {
    ok: false,
    configured: true,
    tokenSource,
    error: "news_search returned no rows (check 6551 plan / OpenNews access)",
  };
}
