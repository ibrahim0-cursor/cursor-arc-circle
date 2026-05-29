/** Filter spam / invalid headlines for PRISM intel and token dossiers */

const SPAM_PATTERNS = [
  /click here/i,
  /you won't believe/i,
  /free (btc|bitcoin|crypto|airdrop)/i,
  /guaranteed (profit|returns)/i,
  /1000x/i,
  /send .* (eth|usdc|btc)/i,
  /wallet connect/i,
  /claim your/i,
];

const MIN_TITLE_LEN = 12;
const MAX_TITLE_LEN = 220;

export function isQualityHeadline(title: string, opts?: { minScore?: number; aiScore?: number }): boolean {
  const t = title.trim();
  if (t.length < MIN_TITLE_LEN || t.length > MAX_TITLE_LEN) return false;
  if (SPAM_PATTERNS.some((p) => p.test(t))) return false;
  if (/^[\d\s.%$]+$/.test(t)) return false;
  if (opts?.aiScore != null && opts.aiScore < (opts.minScore ?? 0)) return false;
  return true;
}

export function dedupeHeadlines<T extends { title: string; source?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = r.title.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
    if (seen.has(key)) return false;
    seen.add(key);
    return isQualityHeadline(r.title);
  });
}
