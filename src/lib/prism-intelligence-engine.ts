/**
 * Cross-market crypto intelligence engine — quantitative routing, not headline summarization.
 */

import type { PrismMacroSnapshot } from "./prism-macro-snapshot";
import type { PrismPrediction } from "./storage";
import { mergeIntelSources, type IntelItem } from "./prism-intel-filter";

export type PrismEventCategory = PrismPrediction["category"];

export type PrismMarketRegime =
  | "risk-on"
  | "risk-off"
  | "macro-fear"
  | "liquidity-expansion"
  | "liquidity-contraction"
  | "volatility-expansion"
  | "neutral";

export type NewsClass =
  | "macro"
  | "geopolitical"
  | "regulation"
  | "monetary-policy"
  | "energy-oil"
  | "crypto-native"
  | "banking"
  | "etf-institutional"
  | "technology"
  | "cybersecurity"
  | "general";

export type ScoredHeadline = IntelItem & {
  newsClass: NewsClass;
  cryptoRelevance: number;
  eventMatchPct: number;
  impact: "bullish" | "bearish" | "volatility" | "uncertainty" | "liquidity-expand" | "liquidity-contract" | "neutral";
  sectors: string[];
  duration: "intraday" | "short-term" | "medium-term" | "structural";
  transmission: string[];
};

export type PrismEngineContext = {
  regime: PrismMarketRegime;
  regimeDetail: string;
  signalAgreement: number;
  weights: Record<string, number>;
  scoredHeadlines: ScoredHeadline[];
  transmissionChain: string[];
  sectorImpact: string;
  invalidation: string;
  weakCausalityRejected: string[];
  memoryNote: string;
};

const CATEGORY_WEIGHTS: Record<
  PrismEventCategory,
  Record<string, number>
> = {
  macro: {
    macro: 0.35,
    monetary: 0.2,
    liquidity: 0.15,
    geopolitical: 0.1,
    sentiment: 0.05,
    onchain: 0.05,
    technical: 0.1,
  },
  markets: {
    onchain: 0.25,
    liquidity: 0.2,
    technical: 0.2,
    sentiment: 0.15,
    macro: 0.1,
    monetary: 0.1,
  },
  geopolitical: {
    geopolitical: 0.35,
    macro: 0.2,
    energy: 0.15,
    liquidity: 0.15,
    sentiment: 0.05,
    onchain: 0.05,
    defi: 0,
  },
};

const REGIME_WEIGHTS: Partial<Record<PrismMarketRegime, Record<string, number>>> = {
  "risk-on": { sentiment: 0.2, technical: 0.2, onchain: 0.2, macro: 0.15, liquidity: 0.15 },
  "risk-off": { macro: 0.35, geopolitical: 0.25, liquidity: 0.2, sentiment: 0.1, onchain: 0.1 },
  "macro-fear": { macro: 0.35, geopolitical: 0.25, liquidity: 0.2, sentiment: 0.1 },
  "liquidity-contraction": { liquidity: 0.3, macro: 0.3, onchain: 0.2, sentiment: 0.1 },
  "liquidity-expansion": { liquidity: 0.25, onchain: 0.25, sentiment: 0.2, macro: 0.15 },
};

function classifyNews(title: string): NewsClass {
  const t = title.toLowerCase();
  if (/fed|cpi|inflation|unemployment|yield|treasury|rate cut|rate hike|fomc|dxy|dollar index/i.test(t)) {
    return "monetary-policy";
  }
  if (/oil|wti|brent|opec|energy|gas price/i.test(t)) return "energy-oil";
  if (/war|sanction|missile|conflict|geopolit|military|iran|israel|ukraine|tariff|trade war/i.test(t)) {
    return "geopolitical";
  }
  if (/sec |etf|blackrock|institutional|grayscale|regulat|congress|treasury secretary/i.test(t)) {
    return "regulation";
  }
  if (/bitcoin|btc|ethereum|eth|crypto|defi|stablecoin|memecoin|solana|token/i.test(t)) {
    return "crypto-native";
  }
  if (/bank|credit|liquidity crisis|deposit|svb|commercial real/i.test(t)) return "banking";
  if (/ai |nvidia|semiconductor|tech earnings/i.test(t)) return "technology";
  if (/hack|exploit|cyber/i.test(t)) return "cybersecurity";
  if (/gdp|pmi|macro|economy|recession/i.test(t)) return "macro";
  return "general";
}

function cryptoRelevanceForClass(newsClass: NewsClass, category: PrismEventCategory): number {
  const base: Record<NewsClass, number> = {
    "monetary-policy": 88,
    macro: 82,
    "energy-oil": 72,
    geopolitical: 70,
    regulation: 85,
    "crypto-native": 95,
    banking: 78,
    "etf-institutional": 90,
    technology: 55,
    cybersecurity: 80,
    general: 40,
  };
  let score = base[newsClass] ?? 45;
  if (category === "macro" && (newsClass === "monetary-policy" || newsClass === "macro")) score += 8;
  if (category === "geopolitical" && newsClass === "geopolitical") score += 10;
  if (category === "markets" && newsClass === "crypto-native") score += 8;
  if (category === "macro" && newsClass === "crypto-native") score -= 15;
  if (category === "geopolitical" && newsClass === "general") score -= 20;
  return Math.min(100, Math.max(0, score));
}

function impactFromTitle(title: string, macro: PrismMacroSnapshot): ScoredHeadline["impact"] {
  const t = title.toLowerCase();
  if (/war|sanction|strike|hack|collapse|default|crisis/i.test(t)) return "uncertainty";
  if (/surge|rally|approval|cut|stimulus|inflow|record high/i.test(t)) return "bullish";
  if (/selloff|hike|tightening|outflow|ban|restrict|plunge/i.test(t)) return "bearish";
  if (/volatile|swing|whipsaw|uncertain/i.test(t)) return "volatility";
  if (macro.defi?.change7dPct != null && macro.defi.change7dPct > 3) return "liquidity-expand";
  if (macro.defi?.change7dPct != null && macro.defi.change7dPct < -3) return "liquidity-contract";
  if (macro.market && macro.market.btcChange24h < -2) return "bearish";
  if (macro.market && macro.market.btcChange24h > 2) return "bullish";
  return "neutral";
}

function sectorsForImpact(impact: ScoredHeadline["impact"], newsClass: NewsClass): string[] {
  if (newsClass === "energy-oil" || newsClass === "geopolitical") {
    return ["BTC", "ETH", "high-beta alts", "DeFi"];
  }
  if (newsClass === "monetary-policy") {
    return ["BTC", "ETH", "DeFi", "stablecoins"];
  }
  if (impact === "liquidity-contract") return ["altcoins", "memecoins", "DeFi"];
  if (impact === "bullish") return ["BTC", "ETH", "infrastructure", "Layer-2"];
  return ["BTC", "ETH", "market-wide"];
}

function buildTransmission(
  newsClass: NewsClass,
  impact: ScoredHeadline["impact"],
  macro: PrismMacroSnapshot,
): string[] {
  if (newsClass === "energy-oil" && (impact === "bearish" || impact === "uncertainty")) {
    return [
      "Oil spike",
      "inflation expectations",
      "hawkish Fed pricing",
      "higher real yields",
      "risk-off in crypto",
      "altcoin underperformance",
    ];
  }
  if (newsClass === "monetary-policy" && impact === "bullish") {
    return [
      "Cooling inflation / labor softening",
      "lower terminal rate expectations",
      "falling yields",
      "liquidity relief",
      "BTC beta rallies",
    ];
  }
  if (newsClass === "geopolitical") {
    return [
      "Geopolitical escalation",
      "safe-haven bid",
      "volatility expansion",
      "risk appetite compression",
      "crypto beta weak vs BTC",
    ];
  }
  if (impact === "liquidity-contract") {
    return [
      "Stablecoin / DeFi TVL contraction",
      "thinner alt liquidity",
      "higher slippage risk",
      "funding stress on high-beta",
    ];
  }
  const fred = macro.fred?.label?.toLowerCase() ?? "";
  if (fred.includes("cpi") && macro.fred && macro.fred.changePct != null && macro.fred.changePct > 0) {
    return ["Hot CPI print", "rates repricing higher", "DXY firm", "crypto risk-off", "long-duration alts vulnerable"];
  }
  return ["Headline shock", "cross-asset repricing", "crypto follows macro liquidity"];
}

function detectRegime(macro: PrismMacroSnapshot): { regime: PrismMarketRegime; detail: string } {
  const btc = macro.market?.btcChange24h ?? 0;
  const mcap = macro.market?.marketCapChange24h ?? 0;
  const defi = macro.defi?.change7dPct ?? 0;

  if (defi < -4 && mcap < -1) {
    return { regime: "liquidity-contraction", detail: "DeFi TVL falling · mcap soft — liquidity contraction regime" };
  }
  if (defi > 4 && btc > 1) {
    return { regime: "liquidity-expansion", detail: "TVL expanding · BTC firm — liquidity expansion regime" };
  }
  if (btc < -3 && mcap < -2) {
    return { regime: "macro-fear", detail: "BTC and total mcap under pressure — macro fear regime" };
  }
  if (btc < -2 || mcap < -1.5) {
    return { regime: "risk-off", detail: `BTC ${btc.toFixed(1)}% · mcap ${mcap.toFixed(1)}% — defensive regime` };
  }
  if (btc > 2 && mcap > 0) {
    return { regime: "risk-on", detail: `BTC +${btc.toFixed(1)}% · selective risk-on` };
  }
  if (Math.abs(btc) > 4) {
    return { regime: "volatility-expansion", detail: "Large BTC move — volatility expansion regime" };
  }
  return { regime: "neutral", detail: "Mixed macro — idiosyncratic crypto drivers matter more" };
}

function eventMatchScore(title: string, eventLabel: string, query: string): number {
  const terms = [...eventLabel.toLowerCase().split(/\W+/), ...query.toLowerCase().split(/\W+/)].filter(
    (w) => w.length > 3,
  );
  const t = title.toLowerCase();
  let hits = 0;
  for (const term of new Set(terms)) {
    if (t.includes(term)) hits += 1;
  }
  return Math.min(100, Math.round((hits / Math.max(3, Math.min(terms.length, 8))) * 100));
}

function categoryAllowsClass(category: PrismEventCategory, newsClass: NewsClass): boolean {
  if (category === "macro") {
    return !["technology", "cybersecurity"].includes(newsClass) || newsClass === "crypto-native";
  }
  if (category === "geopolitical") {
    return ["geopolitical", "energy-oil", "macro", "monetary-policy", "banking"].includes(newsClass);
  }
  return true;
}

export function scoreHeadlinesForIntel(
  items: IntelItem[],
  eventLabel: string,
  query: string,
  category: PrismEventCategory,
  macro: PrismMacroSnapshot,
): ScoredHeadline[] {
  return items
    .map((item) => {
      const newsClass = classifyNews(item.title);
      const eventMatchPct = eventMatchScore(item.title, eventLabel, query);
      const cryptoRelevance = Math.round(
        (cryptoRelevanceForClass(newsClass, category) * 0.55 + eventMatchPct * 0.45),
      );
      const impact = impactFromTitle(item.title, macro);
      return {
        ...item,
        newsClass,
        cryptoRelevance,
        eventMatchPct,
        impact,
        sectors: sectorsForImpact(impact, newsClass),
        duration: (newsClass === "geopolitical" ? "short-term" : "medium-term") as ScoredHeadline["duration"],
        transmission: buildTransmission(newsClass, impact, macro),
      };
    })
    .filter((h) => categoryAllowsClass(category, h.newsClass))
    .filter((h) => h.cryptoRelevance >= 45 && h.eventMatchPct >= 22)
    .sort((a, b) => b.cryptoRelevance + b.eventMatchPct - (a.cryptoRelevance + a.eventMatchPct));
}

export function detectSignalAgreement(
  macro: PrismMacroSnapshot,
  headlines: ScoredHeadline[],
): number {
  let agree = 0;
  let total = 0;
  const btcUp = (macro.market?.btcChange24h ?? 0) > 0;
  const bullishHeadlines = headlines.filter((h) => h.impact === "bullish").length;
  const bearishHeadlines = headlines.filter((h) => h.impact === "bearish" || h.impact === "uncertainty").length;

  if (macro.market) {
    total += 1;
    if ((btcUp && bullishHeadlines >= bearishHeadlines) || (!btcUp && bearishHeadlines >= bullishHeadlines)) {
      agree += 1;
    }
  }
  if (macro.fred?.changePct != null) {
    total += 1;
    const hot = macro.fred.changePct > 0 && macro.fred.seriesId === "CPIAUCSL";
    if ((hot && bearishHeadlines > 0) || (!hot && bullishHeadlines > 0)) agree += 1;
  }
  if (macro.defi?.change7dPct != null) {
    total += 1;
    const expanding = macro.defi.change7dPct > 0;
    if ((expanding && bullishHeadlines >= bearishHeadlines) || (!expanding && bearishHeadlines > 0)) {
      agree += 1;
    }
  }
  return total === 0 ? 0.5 : agree / total;
}

export function buildPrismEngineContext(
  event: string,
  category: PrismEventCategory,
  query: string,
  macro: PrismMacroSnapshot,
  intel: { gdelt?: IntelItem[]; news?: IntelItem[]; eventRegistry?: IntelItem[] },
  memoryNote: string,
): PrismEngineContext {
  const merged = mergeIntelSources(intel);
  const scoredHeadlines = scoreHeadlinesForIntel(merged, event, query, category, macro);
  const { regime, detail } = detectRegime(macro);
  const signalAgreement = detectSignalAgreement(macro, scoredHeadlines);

  const weights = { ...CATEGORY_WEIGHTS[category], ...(REGIME_WEIGHTS[regime] ?? {}) };

  const top = scoredHeadlines[0];
  const transmissionChain = top?.transmission ?? buildTransmission("macro", "neutral", macro);

  const sectorImpact =
    category === "geopolitical"
      ? "Geopolitical shock likely hits high-beta alts and DeFi first; BTC may hold relative bid as liquidity seeks quality."
      : category === "macro"
        ? "Macro transmission favors BTC/ETH vs long-duration alts when yields and DXY move against risk."
        : "Crypto-native flow dominates — watch funding, stablecoin inflows, and BTC dominance for beta rotation.";

  const invalidation =
    regime === "risk-on"
      ? "Invalidation: yields spike >15bp, DXY breakout, or DeFi TVL weekly drop >5%."
      : "Invalidation: Fed rhetoric turns dovish, oil collapses >8%, or stablecoin inflows accelerate.";

  const weakCausalityRejected = [
    "Rejected: single-variable leaps (e.g. BTC up → Fed cut) without CPI/yields/liquidity chain",
    category === "geopolitical" ? "Ignored: DeFi TVL as primary driver for geopolitical events" : "",
    category === "macro" ? "Ignored: meme sentiment without macro transmission" : "",
  ].filter(Boolean);

  return {
    regime,
    regimeDetail: detail,
    signalAgreement,
    weights,
    scoredHeadlines,
    transmissionChain,
    sectorImpact,
    invalidation,
    weakCausalityRejected,
    memoryNote,
  };
}

export function computeQuantForecast(
  event: string,
  category: PrismEventCategory,
  engine: PrismEngineContext,
  macro: PrismMacroSnapshot,
): Omit<PrismPrediction, "id" | "timestamp" | "arcTxHash"> {
  const bullish = engine.scoredHeadlines.filter((h) => h.impact === "bullish").length;
  const bearish = engine.scoredHeadlines.filter(
    (h) => h.impact === "bearish" || h.impact === "uncertainty" || h.impact === "liquidity-contract",
  ).length;

  let base = category === "geopolitical" ? 38 : category === "macro" ? 46 : 52;
  if (engine.regime === "risk-on") base += 6;
  if (engine.regime === "risk-off" || engine.regime === "macro-fear") base -= 8;
  if (bullish > bearish + 1) base += 10;
  if (bearish > bullish + 1) base -= 10;

  if (macro.fred?.seriesId === "DFF" && macro.fred.changePct != null && macro.fred.changePct < 0) {
    base += category === "macro" ? 8 : 0;
  }
  if (macro.fred?.seriesId === "CPIAUCSL" && macro.fred.changePct != null && macro.fred.changePct > 0) {
    base += category === "macro" ? 6 : 0;
  }

  const probability = Math.min(88, Math.max(10, Math.round(base)));

  let confidence = 48 + Math.round(engine.signalAgreement * 28);
  confidence += engine.scoredHeadlines.length >= 4 ? 8 : 0;
  confidence += macro.fred ? 6 : 0;
  if (engine.signalAgreement < 0.45) confidence -= 12;
  if (engine.regime === "volatility-expansion") confidence -= 8;
  confidence = Math.min(85, Math.max(35, confidence));

  const transmissionText = engine.transmissionChain.join(" → ");

  return {
    event,
    category,
    probability,
    confidence,
    kellyFraction: confidence > 70 ? 0.1 : 0.06,
    horizon: category === "geopolitical" ? "7–14 days" : "14–30 days",
    summary: `${engine.regime.replace(/-/g, " ")} regime · ${probability}% for “${event}” with ${engine.sectorImpact.split(";")[0]}.`,
    reasoning: `Transmission: ${transmissionText}. ${engine.regimeDetail} Signal agreement ${Math.round(engine.signalAgreement * 100)}%. ${engine.invalidation}`,
    sources: [
      ...macro.factors.slice(0, 2),
      ...engine.scoredHeadlines.slice(0, 2).map((h) => `${h.source}: ${h.cryptoRelevance}% crypto relevance`),
    ],
  };
}

export const PRISM_ENGINE_SYSTEM_PROMPT = `You are PRISM, a cross-market crypto intelligence engine (NOT a chatbot).
Rules:
- Reason through transmission chains (macro → yields → liquidity → crypto beta). Never use weak causality (e.g. "BTC up therefore Fed cuts").
- Weight signals by event category: macro uses CPI/yields/FRED; geopolitical uses conflict/oil/sanctions; crypto markets use funding/liquidity/onchain.
- Output strict JSON: probability (0-100), confidence (0-100, max 85 unless memory validates higher), kellyFraction (0-1), horizon, summary (actionable, sector-specific), reasoning (transmission chain + invalidation), sources (short strings).
- Reject unrelated signals. Prefer quantitative macroFactors over narrative alone.`;
