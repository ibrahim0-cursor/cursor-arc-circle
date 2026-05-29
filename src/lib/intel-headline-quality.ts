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

/** Consumer finance listicles — not macro desk intel for Fed/CPI events. */
export function isConsumerFinanceNoise(title: string): boolean {
  const t = title.toLowerCase();
  return (
    /high[- ]yield savings|savings interest rates|best cd rates|certificate of deposit|apy today|lock in up to \d+% apy/i.test(
      t,
    ) || (/best .* rates today/i.test(t) && !/fed|fomc|treasury|yield curve|cpi/i.test(t))
  );
}

/** Tier 0 = entertainment/low-trust for macro desk; 3 = wire services. */
export function sourceTrustTier(source: string): number {
  const s = source.toLowerCase();
  if (/reuters|bloomberg|financial.?times|\bft\b|wsj|wall street journal|associated press|\bap news\b|federalreserve|fomc/.test(s)) {
    return 3;
  }
  if (/cnbc|marketwatch|investing\.com|theguardian|coindesk|the block|barron|economist|bankrate/.test(s)) {
    return 2;
  }
  if (/yahoo entertainment|msn\.com|tabloid|clickbait|crypto daily/i.test(s)) {
    return 0;
  }
  if (/yahoo|google news|unknown|gdelt/i.test(s)) return 1;
  return 1;
}

export function isOffTopicForEvent(
  title: string,
  eventLabel: string,
  category: "macro" | "geopolitical" | "markets",
): boolean {
  if (isConsumerFinanceNoise(title)) return true;
  const t = title.toLowerCase();
  const e = eventLabel.toLowerCase();

  if (category === "macro" && /fed|fomc|rate cut|interest rate|federal reserve/i.test(e)) {
    return !/fed|fomc|federal reserve|interest rate|rate cut|powell|monetary policy|basis point|dot plot|treasury yield/i.test(
      t,
    );
  }
  if (category === "macro" && /cpi|inflation/i.test(e)) {
    return !/cpi|inflation|consumer price|pce|producer price/i.test(t);
  }
  return false;
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
