/** Labels/details already shown in token header + metrics grid — omit from key signals. */
const REDUNDANT_LABELS = new Set([
  "24h momentum",
  "liquidity depth",
  "market cap",
  "mcap",
  "buy/sell flow",
  "24h tape",
  "flow",
  "fdv",
  "24h turnover",
  "on-chain flow",
  "vol 24h",
  "volume 24h",
  "volume",
  "liquidity",
  "buys",
  "sells",
  "24h change",
  "price change",
]);

type FactorLike = { label: string; detail: string; impact?: string };

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

function isRedundantFactor(f: FactorLike): boolean {
  const key = normalizeLabel(f.label);
  if (REDUNDANT_LABELS.has(key)) return true;
  if (key.includes("24h") && (key.includes("momentum") || key.includes("change"))) return true;
  if (key.startsWith("liquidity") || key === "liq") return true;
  if (key.includes("market cap") || key.includes("mcap")) return true;
  if (/^\d+\s+buys\s+vs\s+\d+\s+sells/i.test(f.detail)) return true;
  if (/^[\+\-]?[\d.]+%(\s+price change)?$/i.test(f.detail.trim())) return true;
  if (/pool liquidity$/i.test(f.detail)) return true;
  if (/fully diluted valuation$/i.test(f.detail)) return true;
  if (/volume vs liquidity/i.test(f.detail)) return true;
  if (/^\$[\d.,]+[KMB]?(?:\s*·\s*|\s+)?vol/i.test(f.detail)) return true;
  if (/^\$[\d.,]+[KMB]?\s*pool/i.test(f.detail)) return true;
  if (/^[\+\-]?[\d.]+%\s*·\s*\$/.test(f.detail)) return true;
  if (/total mcap|btc\s*[\+\-]?[\d.]/i.test(f.detail) && key.includes("macro")) return true;
  return false;
}

function isTaFactor(label: string): boolean {
  const k = normalizeLabel(label);
  return (
    k === "macd" ||
    k === "trend" ||
    k.includes("rsi") ||
    k.startsWith("ta ") ||
    k.includes("technical setup") ||
    k.includes("ta 1h") ||
    k.includes("ta 15m")
  );
}

function combinedTaImpact(impacts: (string | undefined)[]): "bullish" | "bearish" | "neutral" {
  let bull = 0;
  let bear = 0;
  for (const i of impacts) {
    if (i === "bullish") bull++;
    if (i === "bearish") bear++;
  }
  if (bear > bull) return "bearish";
  if (bull > bear) return "bullish";
  return "neutral";
}

function mergeTaFactors<T extends FactorLike>(factors: T[]): T[] {
  const ta = factors.filter((f) => isTaFactor(f.label));
  if (ta.length <= 1) return factors;
  const rest = factors.filter((f) => !isTaFactor(f.label));
  const merged = {
    ...ta[0],
    label: "Technical setup",
    detail: ta.map((f) => f.detail).join(" · "),
    impact: combinedTaImpact(ta.map((f) => f.impact)),
  } as T;
  return [...rest, merged];
}

function sanitizeMacroFactor<T extends FactorLike>(f: T): T {
  const key = normalizeLabel(f.label);
  if (!key.includes("macro")) return f;
  if (/risk-off|defensive/i.test(f.detail)) {
    return {
      ...f,
      detail:
        "Risk-off regime (PRISM) — defensive sizing; prioritize exit liquidity and holder quality.",
    };
  }
  if (/risk-on/i.test(f.detail)) {
    return {
      ...f,
      detail: "Risk-on regime (PRISM) — selective momentum OK when liquidity supports size.",
    };
  }
  return {
    ...f,
    detail: "Neutral macro (PRISM) — token-specific structure and flow matter most here.",
  };
}

/** Merge split TA rows and strip macro ticker spam before display. */
export function consolidateReasoningFactors<T extends FactorLike>(factors: T[]): T[] {
  return mergeTaFactors(factors.map(sanitizeMacroFactor));
}

/** Dedupe and drop stats repeated in header / metrics for every token view. */
export function filterReasoningFactorsForDisplay<T extends FactorLike>(
  factors: T[],
  max = 6,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  let hasConcentration = false;

  for (const f of consolidateReasoningFactors(factors)) {
    if (isRedundantFactor(f)) continue;
    const key = normalizeLabel(f.label);
    if (seen.has(key)) continue;
    if (key.includes("concentration")) {
      if (hasConcentration) continue;
      hasConcentration = true;
    }
    seen.add(key);
    out.push(f);
  }
  return out.slice(0, max);
}

/** Strip duplicate stats from agent payloads (feed cache, stored decisions). */
export function sanitizeAgentReasoningFactors<
  T extends FactorLike & { impact?: string; weight?: number },
>(factors: T[] | undefined, max = 8): T[] {
  if (!factors?.length) return [];
  return filterReasoningFactorsForDisplay(factors, max);
}
