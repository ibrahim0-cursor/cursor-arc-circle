/**
 * 6551 OpenNews — crypto news with AI impact scores.
 * CLI/MCP: npx skills add 6551Team/opennews-mcp · Env: OPENNEWS_TOKEN
 */

import { clean6551Token, fetch6551 } from "./6551-client";

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
  return Boolean(clean6551Token(process.env.OPENNEWS_TOKEN));
}

function token(): string | null {
  return clean6551Token(process.env.OPENNEWS_TOKEN) ?? null;
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

export async function probeOpenNews(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasOpenNewsToken()) {
    return { ok: false, configured: false, error: "OPENNEWS_TOKEN not set" };
  }
  const rows = await searchOpenNews({ q: "bitcoin", limit: 3 });
  if (rows.length > 0) return { ok: true, configured: true };
  return { ok: false, configured: true, error: "news_search empty or rate limited" };
}
