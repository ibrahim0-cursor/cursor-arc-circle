/**
 * Stocktwits enterprise news feeds (Basic auth).
 * https://api-gw-prd.stocktwits.com — contact enterprise-support@stocktwits.com for credentials.
 */

export type StocktwitsPulseItem = {
  title: string;
  link?: string;
  symbols: string[];
};

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasStocktwitsCredentials(): boolean {
  const user = cleanEnv(process.env.STOCKTWITS_USERNAME) ?? cleanEnv(process.env.STOCKTWITS_API_USER);
  const pass =
    cleanEnv(process.env.STOCKTWITS_PASSWORD) ??
    cleanEnv(process.env.STOCKTWITS_API_PASSWORD) ??
    cleanEnv(process.env.STOCKTWITS_API_KEY);
  return Boolean(user && pass);
}

function authHeader(): string | null {
  const user = cleanEnv(process.env.STOCKTWITS_USERNAME) ?? cleanEnv(process.env.STOCKTWITS_API_USER);
  const pass =
    cleanEnv(process.env.STOCKTWITS_PASSWORD) ??
    cleanEnv(process.env.STOCKTWITS_API_PASSWORD) ??
    cleanEnv(process.env.STOCKTWITS_API_KEY);
  if (!user || !pass) return null;
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

const BASE = "https://api-gw-prd.stocktwits.com";

export async function probeStocktwits(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasStocktwitsCredentials()) {
    return { ok: false, configured: false, error: "STOCKTWITS_USERNAME + STOCKTWITS_PASSWORD not set" };
  }
  const auth = authHeader();
  if (!auth) return { ok: false, configured: false };

  try {
    const res = await fetch(`${BASE}/api-middleware/external/news/rss/abstract?limit=1`, {
      headers: { Authorization: auth, Accept: "application/rss+xml, application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return res.ok
      ? { ok: true, configured: true }
      : { ok: false, configured: true, error: `HTTP ${res.status}` };
  } catch {
    return { ok: false, configured: true, error: "request failed" };
  }
}

function parseRssTitles(xml: string, symbol: string): StocktwitsPulseItem[] {
  const sym = symbol.toUpperCase();
  const items: StocktwitsPulseItem[] = [];
  const blocks = xml.split("<item>").slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link>([^<]+)<\/link>/i);
    const symMatches = [...block.matchAll(/<symbol>([^<]+)<\/symbol>/gi)];
    const symbols = symMatches.map((m) => m[1].trim().toUpperCase());
    const title = titleMatch?.[1]?.trim();
    if (!title) continue;
    if (symbols.length > 0 && !symbols.includes(sym) && !title.toUpperCase().includes(sym)) {
      continue;
    }
    items.push({
      title: title.slice(0, 200),
      link: linkMatch?.[1]?.trim(),
      symbols: symbols.length ? symbols : [sym],
    });
    if (items.length >= 5) break;
  }
  return items;
}

export async function fetchStocktwitsBuzz(symbol: string): Promise<StocktwitsPulseItem[]> {
  const auth = authHeader();
  if (!auth) return [];

  const sym = symbol.replace(/^\$/, "").trim();
  if (sym.length < 1) return [];

  try {
    const params = new URLSearchParams({ limit: "25" });
    const res = await fetch(
      `${BASE}/api-middleware/external/news/rss/abstract?${params}`,
      {
        headers: { Authorization: auth, Accept: "application/rss+xml" },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssTitles(xml, sym);
  } catch {
    return [];
  }
}
