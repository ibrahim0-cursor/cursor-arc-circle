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
  /breaking\s*:\s*$/i,
  /shocking truth/i,
  /doctors hate/i,
];

const SENSATIONAL_PATTERNS = [
  /you won't believe/i,
  /shocking/i,
  /secret (reveal|exposed)/i,
  /they don't want you to know/i,
  /1000x|100x guaranteed/i,
  /whale (just|secretly) (bought|sold)/i,
];

const SPAM_DOMAINS = [
  "clickbait",
  "cryptodaily",
  "coin-turk",
  "airdrop",
  "pump.fun",
];

const MIN_TITLE_LEN = 12;
const MAX_TITLE_LEN = 220;

export function isSensationalHeadline(title: string): boolean {
  return SENSATIONAL_PATTERNS.some((p) => p.test(title));
}

export function isQualityHeadline(
  title: string,
  opts?: { minScore?: number; aiScore?: number; source?: string; url?: string },
): boolean {
  const t = title.trim();
  if (t.length < MIN_TITLE_LEN || t.length > MAX_TITLE_LEN) return false;
  if (SPAM_PATTERNS.some((p) => p.test(t))) return false;
  if (isSensationalHeadline(t)) return false;
  if (/^[\d\s.%$]+$/.test(t)) return false;
  if (opts?.aiScore != null && opts.aiScore < (opts.minScore ?? 0)) return false;
  const src = (opts?.source ?? "").toLowerCase();
  if (SPAM_DOMAINS.some((d) => src.includes(d))) return false;
  const url = (opts?.url ?? "").toLowerCase();
  if (url && SPAM_DOMAINS.some((d) => url.includes(d))) return false;
  if (url === "#" || url === "") {
    /* allow missing URL — many feeds omit it */
  }
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
