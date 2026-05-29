import type { CommunityPulse } from "./community-pulse";
import type { CryptoNewsItem } from "./crypto-news";

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Headline must mention this token — blocks generic BTC/macro spam. */
export function titleMatchesToken(title: string, symbol: string, name?: string): boolean {
  const t = normalizeTitle(title);
  const sym = symbol.replace(/^\$/, "").trim().toLowerCase();
  if (sym.length >= 2 && t.includes(sym)) return true;
  const n = name?.trim().toLowerCase();
  if (n && n.length >= 4 && t.includes(n)) return true;
  return false;
}

/** Token-only social/news lines for dossier (deduped, no [meme] echo of same headline). */
export function buildTokenOnlySocialNews(
  symbol: string,
  name: string | undefined,
  community?: CommunityPulse | null,
  news: CryptoNewsItem[] = [],
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();

  const add = (line: string) => {
    const k = normalizeTitle(line.replace(/\s*·\s*[^·]+$/, ""));
    if (k.length < 10 || seen.has(k)) return;
    seen.add(k);
    lines.push(line);
  };

  for (const item of community?.items ?? []) {
    if (item.kind === "opennews") {
      const src = item.source ? ` · ${item.source}` : "";
      add(`${item.title}${src}`);
      continue;
    }
    if (item.kind === "twitter" || item.kind === "reddit") {
      if (titleMatchesToken(item.title, symbol, name)) {
        const src = item.source ? ` · ${item.source}` : "";
        add(`${item.title}${src}`);
      }
    }
  }

  for (const n of news) {
    if (titleMatchesToken(n.title, symbol, name)) {
      add(`${n.title}${n.source ? ` · ${n.source}` : ""}`);
    }
  }

  if (lines.length === 0) {
    add(
      `No verified headlines for $${symbol.replace(/^\$/, "")} — add 6551 OpenNews / Twitter keys on Vercel for symbol-tagged intel.`,
    );
  }

  return lines.slice(0, 6);
}
