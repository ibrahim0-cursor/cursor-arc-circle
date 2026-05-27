import type { TrendingToken } from "./dexscreener";
import { fetchBirdeyeOhlcv } from "./birdeye-ohlcv";
import { hasBirdeyeKey } from "./birdeye-client";
import {
  dexChainIdToGmgn,
  gmgnSmartMoneyHolders,
  gmgnTopHolders,
} from "./gmgn-analytics";
import { hasGmgnApiKey } from "./gmgn-client";
import type { CommunityPulse } from "./community-pulse";
import type { CryptoNewsItem } from "./crypto-news";
import { assessTokenScam } from "./scam-detection";
import { fetchMergedTokenDetection } from "./token-detection";
import {
  computeTechnicalAnalysis,
  normalizePriceChanges,
  type TechnicalAnalysis,
} from "./technical-analysis";
import type { AgentSignal, TokenIntel, TokenWhale } from "./storage";
import type { NexusResearchReport } from "./nexus-research";

export type HolderTableRow = {
  rank: number;
  address: string;
  pctSupply: number;
  label?: string;
  source: "birdeye" | "gmgn" | "dexpaprika" | "demo";
};

export type TraderTableRow = {
  rank: number;
  address: string;
  pnlOrVolume: string;
  trades?: number;
  label?: string;
  source: "birdeye" | "gmgn" | "whale" | "demo";
};

export type TaSignalBadge = "bullish" | "bearish" | "neutral";

export type TaTimeframeBlock = {
  timeframe: "15m" | "1h";
  rsi14: number;
  rsiSignal: TaSignalBadge;
  macd: number;
  macdSignal: TaSignalBadge;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  source: "birdeye_ohlcv" | "dexscreener";
};

export type TokenResearchDossier = {
  atAGlance: string;
  fundamentals: string[];
  teamLinks: { label: string; href: string }[];
  creatorRisk: {
    creatorAddress?: string;
    bubblemapsUrl: string;
    rugFlags: string[];
    scamLabel?: string;
    verdict: "low" | "medium" | "high" | "critical";
  };
  copyTradeWallets: Array<{ address: string; note: string; source: string }>; // source: birdeye | gmgn | demo | whale | dexpaprika
  technical: TaTimeframeBlock[];
  pattern: { label: string; detail: string };
  socialNews: string[];
  dataNotes: string[];
};

export type LiveReasoningFactor = {
  label: string;
  detail: string;
  impact: "bullish" | "bearish" | "neutral";
};

export type LiveReasoningPayload = {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  riskScore: number;
  headline: string;
  narrative: string;
  factors: LiveReasoningFactor[];
  taHeadline: string;
  sources: string[];
};

export type TokenDossierPayload = {
  dossier: TokenResearchDossier;
  topHolders: HolderTableRow[];
  topTraders: TraderTableRow[];
  liveReasoning: LiveReasoningPayload;
  agent?: AgentSignal;
  technical?: TokenIntel["technical"];
  fetchedAt: string;
};

function sma(closes: number[], period: number): number | undefined {
  if (closes.length < period) return undefined;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsiFromCloses(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function taBlockFromCloses(
  closes: number[],
  timeframe: "15m" | "1h",
  source: "birdeye_ohlcv" | "dexscreener",
): TaTimeframeBlock {
  const rsi = rsiFromCloses(closes);
  const rsiSignal: TaSignalBadge =
    rsi > 70 ? "bearish" : rsi < 30 ? "bullish" : "neutral";
  const ema12 = ema(closes.slice(-30), 12);
  const ema26 = ema(closes.slice(-30), 26);
  const macd = ema12 - ema26;
  const macdSignal: TaSignalBadge = macd > 0 ? "bullish" : macd < 0 ? "bearish" : "neutral";
  return {
    timeframe,
    rsi14: Math.round(rsi * 10) / 10,
    rsiSignal,
    macd: Math.round(macd * 10000) / 10000,
    macdSignal,
    ma20: sma(closes, 20),
    ma50: sma(closes, 50),
    ma200: sma(closes, 200),
    source,
  };
}

function taBlockFromDex(token: TrendingToken, timeframe: "15m" | "1h"): TaTimeframeBlock {
  const ta = computeTechnicalAnalysis(
    token.priceUsd,
    normalizePriceChanges(token.priceChange, token.change24h),
    token.volume24h,
    token.liquidityUsd,
  );
  const scale = timeframe === "15m" ? 0.85 : 1;
  return {
    timeframe,
    rsi14: Math.round(ta.rsi * scale * 10) / 10,
    rsiSignal:
      ta.rsiSignal === "oversold"
        ? "bullish"
        : ta.rsiSignal === "overbought"
          ? "bearish"
          : "neutral",
    macd: ta.macd,
    macdSignal: ta.macdSignal as TaSignalBadge,
    source: "dexscreener",
  };
}

export async function resolveMultiTimeframeTa(token: TrendingToken): Promise<TaTimeframeBlock[]> {
  if (hasBirdeyeKey()) {
    const [c15, c1h] = await Promise.all([
      fetchBirdeyeOhlcv(token.tokenAddress, token.chainId, "15m", 24),
      fetchBirdeyeOhlcv(token.tokenAddress, token.chainId, "1H", 48),
    ]);
    const closes15 = c15.map((c) => c.close).filter((c) => c > 0);
    const closes1h = c1h.map((c) => c.close).filter((c) => c > 0);
    const blocks: TaTimeframeBlock[] = [];
    if (closes15.length >= 10) blocks.push(taBlockFromCloses(closes15, "15m", "birdeye_ohlcv"));
    else blocks.push(taBlockFromDex(token, "15m"));
    if (closes1h.length >= 10) blocks.push(taBlockFromCloses(closes1h, "1h", "birdeye_ohlcv"));
    else blocks.push(taBlockFromDex(token, "1h"));
    return blocks;
  }
  return [taBlockFromDex(token, "15m"), taBlockFromDex(token, "1h")];
}

function derivePattern(ta: TechnicalAnalysis | TaTimeframeBlock[], token: TrendingToken): {
  label: string;
  detail: string;
} {
  const h1 = Array.isArray(ta) ? ta.find((t) => t.timeframe === "1h") : null;
  const trend = !Array.isArray(ta) ? ta.trend : undefined;
  const macd = h1?.macdSignal ?? (!Array.isArray(ta) ? (ta.macdSignal as TaSignalBadge) : "neutral");
  const { m5, h1: h1pct, h24 } = {
    m5: token.priceChange?.m5 ?? 0,
    h1: token.priceChange?.h1 ?? 0,
    h24: token.change24h ?? 0,
  };

  if (m5 <= -25 || h1pct <= -30) {
    return { label: "Distribution / dump", detail: "Sharp intraday sell-off — treat as exit-risk tape" };
  }
  if (h24 > 10 && (m5 < -12 || h1pct < -15)) {
    return { label: "Pump → distribution", detail: "Positive 24h but fading 5m/1h — classic meme fade" };
  }
  if (trend === "strong_up" || (h24 > 8 && macd === "bullish")) {
    return { label: "Breakout / momentum", detail: "Higher timeframe momentum with supportive MACD" };
  }
  if (trend === "up" || (h24 > 2 && macd === "bullish")) {
    return { label: "Higher lows", detail: "Uptrend structure — watch for exhaustion near resistance" };
  }
  if (trend === "down" || trend === "strong_down" || macd === "bearish") {
    return { label: "Lower highs", detail: "Bearish structure — rallies are sell-the-bounce until base forms" };
  }
  return { label: "Range / chop", detail: "No clean trend — wait for MACD + flow confirmation" };
}

export function bubblemapsUrl(chainId: string, tokenAddress: string): string {
  const chain = chainId.toLowerCase();
  if (chain === "solana" || chain === "sol") {
    return `https://app.bubblemaps.io/sol/token/${tokenAddress}`;
  }
  if (chain === "base") {
    return `https://app.bubblemaps.io/base/token/${tokenAddress}`;
  }
  if (chain === "ethereum" || chain === "eth") {
    return `https://app.bubblemaps.io/eth/token/${tokenAddress}`;
  }
  return `https://app.bubblemaps.io/explorer?address=${tokenAddress}`;
}

function parseGmgnHolderRows(data: unknown, source: "gmgn"): HolderTableRow[] {
  const list =
    (data as { list?: unknown[] })?.list ??
    (data as { holders?: unknown[] })?.holders ??
    (Array.isArray(data) ? data : []);
  if (!Array.isArray(list)) return [];

  return list.slice(0, 12).map((row, i) => {
    const r = row as Record<string, unknown>;
    const address = String(
      r.address ?? r.wallet_address ?? r.owner ?? r.account ?? `unknown-${i}`,
    );
    let pct = Number(r.amount_percentage ?? r.percentage ?? r.pct ?? r.share ?? 0);
    if (pct > 0 && pct <= 1) pct *= 100;
    const tag = r.tag ?? r.tags;
    const label =
      typeof tag === "string"
        ? tag
        : Array.isArray(tag)
          ? tag.join(", ")
          : typeof r.name === "string"
            ? r.name
            : undefined;
    return {
      rank: i + 1,
      address,
      pctSupply: Math.round(pct * 100) / 100,
      label,
      source,
    };
  });
}

export function holdersFromDetection(
  holders: Array<TokenWhale & { rank?: number }>,
  whales: TokenWhale[],
  source: HolderTableRow["source"],
): HolderTableRow[] {
  const rows = holders.length ? holders : whales;
  return rows.slice(0, 12).map((h, i) => ({
    rank: ("rank" in h && typeof h.rank === "number" ? h.rank : undefined) ?? i + 1,
    address: h.address,
    pctSupply: h.pct,
    label: h.label !== "Holder" ? h.label : undefined,
    source,
  }));
}

export function tradersFromWhalesAndTrades(
  whales: TokenWhale[],
  trades: Array<{ trader: string; amountUsd: number; side: string }>,
  source: TraderTableRow["source"],
): TraderTableRow[] {
  const volByTrader = new Map<string, { vol: number; count: number }>();
  for (const tx of trades) {
    const key = tx.trader.toLowerCase();
    const cur = volByTrader.get(key) ?? { vol: 0, count: 0 };
    cur.vol += tx.amountUsd;
    cur.count += 1;
    volByTrader.set(key, cur);
  }

  const fromTrades = [...volByTrader.entries()]
    .filter(([a]) => a !== "dex-aggregate")
    .sort((a, b) => b[1].vol - a[1].vol)
    .slice(0, 8)
    .map(([address, v], i) => ({
      rank: i + 1,
      address,
      pnlOrVolume: `$${Math.round(v.vol).toLocaleString()} vol`,
      trades: v.count,
      source,
    }));

  if (fromTrades.length >= 3) return fromTrades;

  return whales.slice(0, 8).map((w, i) => ({
    rank: i + 1,
    address: w.address,
    pnlOrVolume: `${w.pct.toFixed(1)}% supply`,
    label: w.label,
    source: "whale" as const,
  }));
}

function demoHolders(token: TrendingToken): HolderTableRow[] {
  const seed = token.tokenAddress.slice(-4);
  return [1, 2, 3, 4, 5].map((rank) => ({
    rank,
    address: `${seed}…demo${rank}`,
    pctSupply: Math.max(2, 18 - rank * 3),
    label: rank === 1 ? "Demo LP / deployer proxy" : "Demo wallet",
    source: "demo" as const,
  }));
}

function demoTraders(token: TrendingToken): TraderTableRow[] {
  const seed = token.tokenAddress.slice(-4);
  return [1, 2, 3, 4].map((rank) => ({
    rank,
    address: `${seed}…trader${rank}`,
    pnlOrVolume: rank === 1 ? "+$12.4K est." : `+$${(8 - rank) * 2.1}K est.`,
    trades: 12 - rank * 2,
    label: "Demo smart money",
    source: "demo" as const,
  }));
}

function buildSocialNews(
  community?: CommunityPulse | null,
  news: CryptoNewsItem[] = [],
): string[] {
  const lines: string[] = [];
  for (const n of news.slice(0, 3)) {
    lines.push(`${n.title}${n.source ? ` · ${n.source}` : ""}`);
  }
  if (community?.items?.length) {
    for (const item of community.items.slice(0, 4)) {
      if (item.kind === "opennews" || item.kind === "twitter" || item.kind === "meme") {
        lines.push(
          `[${item.kind}] ${item.title}${item.score != null ? ` · score ${item.score}` : ""}`,
        );
      }
    }
  }
  if (community?.opennewsBuzz) lines.unshift(`OpenNews: ${community.opennewsBuzz}`);
  if (community?.twitterBuzz) lines.unshift(`Twitter scan: ${community.twitterBuzz}`);
  if (lines.length === 0) {
    lines.push("No symbol-specific headlines — enable OPENNEWS_TOKEN / TWITTER_TOKEN for 6551 sweep");
  }
  return lines.slice(0, 6);
}

export function buildDossierGlance(
  token: TrendingToken,
  intel: TokenIntel,
  agent?: AgentSignal,
  research?: NexusResearchReport,
): string {
  return buildLiveReasoning(token, intel, agent, research).headline;
}

function synthesizeFactors(
  token: TrendingToken,
  intel: TokenIntel,
  technical: TaTimeframeBlock[],
  pattern: { label: string; detail: string },
): LiveReasoningFactor[] {
  const factors: LiveReasoningFactor[] = [];
  const h1 = technical.find((t) => t.timeframe === "1h");
  const m15 = technical.find((t) => t.timeframe === "15m");
  const buys = token.txns24h?.buys ?? intel.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? intel.sell24h ?? 0;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;

  factors.push({
    label: "24h tape",
    detail: `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}% · $${Math.round(token.volume24h).toLocaleString()} vol · ${turnover.toFixed(1)}x turnover`,
    impact: token.change24h > 3 ? "bullish" : token.change24h < -5 ? "bearish" : "neutral",
  });
  factors.push({
    label: "Flow",
    detail: `${buys} buys vs ${sells} sells on 24h swaps`,
    impact: buys > sells * 1.15 ? "bullish" : sells > buys * 1.15 ? "bearish" : "neutral",
  });
  if (h1) {
    factors.push({
      label: `TA 1h (${h1.source === "birdeye_ohlcv" ? "Birdeye" : "Dex"})`,
      detail: `RSI ${h1.rsi14} · MACD ${h1.macdSignal} · MA20 ${h1.ma20 != null ? formatMa(h1.ma20) : "—"}`,
      impact: h1.macdSignal,
    });
  }
  if (m15) {
    factors.push({
      label: "TA 15m",
      detail: `RSI ${m15.rsi14} (${m15.rsiSignal}) · MACD ${m15.macdSignal}`,
      impact: m15.rsiSignal,
    });
  }
  factors.push({
    label: "Structure",
    detail: `${pattern.label} — ${pattern.detail}`,
    impact: pattern.label.includes("Breakout") || pattern.label.includes("Higher")
      ? "bullish"
      : pattern.label.includes("Distribution") || pattern.label.includes("Lower")
        ? "bearish"
        : "neutral",
  });
  if (intel.top10HolderPercent != null) {
    factors.push({
      label: "Concentration",
      detail: `Top 10 wallets ~${intel.top10HolderPercent.toFixed(0)}% of supply`,
      impact: intel.top10HolderPercent > 55 ? "bearish" : intel.top10HolderPercent < 35 ? "bullish" : "neutral",
    });
  }
  const scam = assessTokenScam(token, intel);
  if (scam.flags.length > 0) {
    factors.push({
      label: "Risk scan",
      detail: scam.flags.slice(0, 2).join(" · "),
      impact: scam.isScam ? "bearish" : "neutral",
    });
  }
  return factors.slice(0, 6);
}

function formatMa(v: number): string {
  return v < 1 ? v.toFixed(6) : v < 100 ? v.toFixed(4) : v.toFixed(2);
}

export function buildLiveReasoning(
  token: TrendingToken,
  intel: TokenIntel,
  agent?: AgentSignal,
  research?: NexusResearchReport,
  dossier?: Pick<TokenResearchDossier, "technical" | "pattern" | "socialNews" | "dataNotes">,
): LiveReasoningPayload {
  const scam = assessTokenScam(token, intel);
  const action = agent?.action ?? "HOLD";
  const confidence = agent?.confidence ?? 0;
  const riskScore = agent?.riskScore ?? 50;
  const technical = dossier?.technical ?? [];
  const dexTa = computeTechnicalAnalysis(
    token.priceUsd,
    normalizePriceChanges(token.priceChange, token.change24h),
    token.volume24h,
    token.liquidityUsd,
  );
  const pattern = dossier?.pattern ?? derivePattern(technical.length > 0 ? technical : dexTa, token);

  const m15 = technical.find((t) => t.timeframe === "15m");
  const h1 = technical.find((t) => t.timeframe === "1h");
  const taHeadline = [
    pattern.label,
    m15 ? `15m RSI ${m15.rsi14} (${m15.rsiSignal})` : null,
    h1 ? `1h MACD ${h1.macdSignal}` : null,
    h1?.source === "birdeye_ohlcv" || m15?.source === "birdeye_ohlcv" ? "Birdeye OHLCV" : "Dex momentum est.",
  ]
    .filter(Boolean)
    .join(" · ");

  const sources: string[] = [];
  if (hasBirdeyeKey()) sources.push("Birdeye");
  if (hasGmgnApiKey()) sources.push("GMGN");
  sources.push("DexScreener", "Agent stack");
  if (dossier?.dataNotes?.some((n) => n.includes("6551") || n.includes("OpenNews"))) sources.push("6551 news");

  const narrativeParts = [
    scam.isScam ? `Avoid — ${scam.label}. ${scam.flags[0] ?? ""}` : null,
    agent?.whyAction,
    agent?.reasoning && agent.reasoning !== agent?.whyAction ? agent.reasoning : null,
    research?.thesis?.slice(0, 400),
  ].filter(Boolean);

  let narrative = narrativeParts.join(" ").trim();
  if (!narrative) {
    narrative = `${token.symbol}: ${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}% 24h · $${Math.round(token.liquidityUsd).toLocaleString()} liquidity — expand signal breakdown below for flow, TA, and risk.`;
  }
  const factors =
    agent?.reasoningFactors?.length && agent.reasoningFactors.length > 0
      ? agent.reasoningFactors.map((f) => ({
          label: f.label,
          detail: f.detail,
          impact: f.impact,
        }))
      : synthesizeFactors(token, intel, technical, pattern);

  const headline = scam.isScam
    ? `AVOID · ${scam.label}`
    : `${action} ${confidence}% confidence · risk ${riskScore}/100 · ${pattern.label}`;

  return {
    action,
    confidence,
    riskScore,
    headline,
    narrative: narrative || headline,
    factors,
    taHeadline,
    sources,
  };
}

export async function buildTokenDossierPayload(
  token: TrendingToken,
  opts?: {
    intel?: TokenIntel;
    agent?: AgentSignal;
    community?: CommunityPulse | null;
    news?: CryptoNewsItem[];
    research?: NexusResearchReport;
    detection?: Awaited<ReturnType<typeof fetchMergedTokenDetection>>;
  },
): Promise<TokenDossierPayload> {
  const intel = opts?.intel ?? token.intel ?? {};
  const dataNotes: string[] = [];

  const detectionPromise =
    opts?.detection ??
    fetchMergedTokenDetection(token.tokenAddress, token.chainId, {
      buys: token.txns24h?.buys ?? 0,
      sells: token.txns24h?.sells ?? 0,
      volume: token.volume24h,
    });

  const [detection, technicalBlocks, gmgnHolders, gmgnSmart] = await Promise.all([
    detectionPromise,
    resolveMultiTimeframeTa(token),
    (async () => {
      const chain = dexChainIdToGmgn(token.chainId);
      if (!hasGmgnApiKey() || !chain) return [];
      const res = await gmgnTopHolders(chain, token.tokenAddress, 12);
      if (!res.ok) return [];
      return parseGmgnHolderRows(res.data, "gmgn");
    })(),
    (async () => {
      const chain = dexChainIdToGmgn(token.chainId);
      if (!hasGmgnApiKey() || !chain) return [];
      const res = await gmgnSmartMoneyHolders(chain, token.tokenAddress, 12);
      if (!res.ok) return [];
      return parseGmgnHolderRows(res.data, "gmgn");
    })(),
  ]);

  let topHolders: HolderTableRow[] = gmgnHolders;
  if (topHolders.length === 0 && detection) {
    const src =
      detection.summary.dataSource === "birdeye"
        ? "birdeye"
        : detection.summary.dataSource === "dexpaprika"
          ? "dexpaprika"
          : "birdeye";
    topHolders = holdersFromDetection(detection.holders, detection.whales, src);
  }
  if (topHolders.length === 0) {
    topHolders = demoHolders(token);
    dataNotes.push("Top holders: demo rows (connect Birdeye or GMGN_API_KEY for live data)");
  } else if (gmgnHolders.length > 0) {
    dataNotes.push("Top holders: GMGN OpenAPI");
  } else {
    dataNotes.push(`Top holders: ${detection?.summary.dataSource ?? "on-chain"}`);
  }

  const holderSource =
    detection?.summary && "holderSource" in detection.summary
      ? (detection.summary as { holderSource?: string }).holderSource
      : undefined;
  let topTraders: TraderTableRow[] = tradersFromWhalesAndTrades(
    detection?.whales ?? [],
    detection?.trades ?? [],
    holderSource === "top_traders" ? "birdeye" : "birdeye",
  );

  if (gmgnSmart.length > 0) {
    topTraders = gmgnSmart.slice(0, 8).map((h, i) => ({
      rank: i + 1,
      address: h.address,
      pnlOrVolume: `${h.pctSupply.toFixed(1)}% · smart tag`,
      label: h.label ?? "Smart money",
      source: "gmgn" as const,
    }));
  } else if (topTraders.length < 2) {
    topTraders = demoTraders(token);
    dataNotes.push("Top traders: demo rows (Birdeye top-trader / GMGN smart-money for live)");
  }

  const scam = assessTokenScam(token, intel);
  const deployer =
    detection?.insiders?.find((i) => i.label.includes("deployer"))?.address ??
    detection?.whales?.find((w) => w.pct > 12)?.address ??
    topHolders[0]?.address;

  const buys = token.txns24h?.buys ?? intel.buy24h ?? 0;
  const sells = token.txns24h?.sells ?? intel.sell24h ?? 0;
  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;

  const fundamentals: string[] = [];
  if (opts?.research?.thesis) fundamentals.push(opts.research.thesis.slice(0, 200));
  else {
    if (turnover > 1.2 && turnover < 8) fundamentals.push("Healthy turnover vs liquidity — active meme tape");
    if (buys > sells * 1.1) fundamentals.push("Buy pressure dominates 24h swap count");
    if (token.change24h > 5 && token.change24h < 80) fundamentals.push("Trending momentum without extreme blow-off");
    if (intel.top10HolderPercent != null)
      fundamentals.push(`Top 10 hold ~${intel.top10HolderPercent.toFixed(0)}% of supply`);
  }
  if (fundamentals.length === 0) fundamentals.push("Alt memecoin — verify narrative on Dex + social before size");

  const teamLinks: { label: string; href: string }[] = [
    { label: "DexScreener", href: token.url },
  ];
  if (token.chainId.toLowerCase().includes("sol")) {
    teamLinks.push({
      label: "Solscan",
      href: `https://solscan.io/token/${token.tokenAddress}`,
    });
  } else {
    teamLinks.push({
      label: "Explorer",
      href: `https://dexscreener.com/${token.chainId}/${token.pairAddress}`,
    });
  }

  const copyTradeWallets: TokenResearchDossier["copyTradeWallets"] = topTraders
    .filter((t) => t.source !== "demo")
    .slice(0, 5)
    .map((t) => ({
      address: t.address,
      note: t.label ?? t.pnlOrVolume,
      source: t.source,
    }));
  if (copyTradeWallets.length === 0) {
    topHolders.slice(0, 3).forEach((h) => {
      copyTradeWallets.push({
        address: h.address,
        note: `${h.pctSupply.toFixed(1)}% supply`,
        source: h.source,
      });
    });
  }

  const ta1h = technicalBlocks.find((t) => t.timeframe === "1h");
  const pattern = derivePattern(
    ta1h
      ? {
          rsi: ta1h.rsi14,
          rsiSignal: ta1h.rsiSignal === "bullish" ? "oversold" : ta1h.rsiSignal === "bearish" ? "overbought" : "neutral",
          macd: ta1h.macd,
          macdSignal: ta1h.macdSignal,
          macdHistogram: ta1h.macd,
          trend:
            ta1h.macdSignal === "bullish" && token.change24h > 5
              ? "up"
              : ta1h.macdSignal === "bearish"
                ? "down"
                : "sideways",
          trendLine: "",
          support: 0,
          resistance: 0,
          volumeTrend: "flat",
          score: 50,
        }
      : computeTechnicalAnalysis(
          token.priceUsd,
          normalizePriceChanges(token.priceChange, token.change24h),
          token.volume24h,
          token.liquidityUsd,
        ),
    token,
  );

  const rugFlags: string[] = [...scam.flags.slice(0, 4)];
  if (intel.isMintable) rugFlags.push("Mint authority may be active");
  if (intel.isFreezable) rugFlags.push("Freeze authority flagged");

  const dossier: TokenResearchDossier = {
    atAGlance: "",
    fundamentals: fundamentals.slice(0, 3),
    teamLinks,
    creatorRisk: {
      creatorAddress: deployer,
      bubblemapsUrl: bubblemapsUrl(token.chainId, token.tokenAddress),
      rugFlags,
      scamLabel: scam.isScam ? scam.label : undefined,
      verdict: scam.isScam
        ? "critical"
        : scam.severity > 50
          ? "high"
          : (intel.top10HolderPercent ?? 0) > 45
            ? "medium"
            : "low",
    },
    copyTradeWallets,
    technical: technicalBlocks,
    pattern,
    socialNews: buildSocialNews(opts?.community, opts?.news),
    dataNotes,
  };

  const liveReasoning = buildLiveReasoning(token, intel, opts?.agent, opts?.research, dossier);
  dossier.atAGlance = liveReasoning.narrative.slice(0, 280);

  return {
    dossier,
    topHolders,
    topTraders,
    liveReasoning,
    agent: opts?.agent,
    technical: intel.technical,
    fetchedAt: new Date().toISOString(),
  };
}
