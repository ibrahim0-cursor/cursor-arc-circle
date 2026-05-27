import { randomUUID } from "crypto";
import { getAiClient, getAiModel } from "./ai-client";
import { fetchCryptoNewsHeadlines } from "./crypto-news";
import { pickCommunityBuzz } from "./community-pulse";
import { usePremiumSocialApis } from "./social-config";
import { fetchTrendingMarketTokens, fetchSwappableTokens, type TrendingToken } from "./dexscreener";
import { buildDeepTokenIntel } from "./deep-token-analysis";
import { buildLocalTokenIntel } from "./token-intel-local";
import { checkSwappable } from "./swappable";
import { anchorDecisionPayload } from "./arc";
import { addNexusDecision, type NexusDecision, type TokenIntel, type AgentSignal, type ReasoningFactor } from "./storage";
import { assessTokenScam, applyScamAndSecurity } from "./scam-detection";
import { fetchTokenByAddress } from "./dexscreener";
import { getMacroRegime, type MacroRegime } from "./macro-regime";
import { hasBirdeyeKey } from "./birdeye-client";
import { resolveTokenTechnical, technicalToIntel } from "./market-ta";
import type { TokenSocialIntel } from "./social-intel";


function buildReasoningFactors(
  token: TrendingToken,
  intel: TokenIntel,
  action: NexusDecision["action"],
  macro?: MacroRegime | null,
): ReasoningFactor[] {
  const factors: ReasoningFactor[] = [];

  if (macro) {
    const macroImpact =
      macro.label === "risk-on"
        ? action === "BUY"
          ? "bullish"
          : "neutral"
        : macro.label === "risk-off"
          ? action === "BUY"
            ? "bearish"
            : "neutral"
          : "neutral";
    factors.push({
      label: "Macro regime (PRISM)",
      detail: macro.detail,
      impact: macroImpact,
      weight: macro.label === "risk-off" ? 18 : macro.label === "risk-on" ? 12 : 8,
    });
  }

  const momentumImpact =
    token.change24h > 5 ? "bullish" : token.change24h < -5 ? "bearish" : "neutral";
  factors.push({
    label: "24h Momentum",
    detail: `${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(2)}% price change`,
    impact: momentumImpact,
    weight: Math.min(30, Math.abs(token.change24h) * 2),
  });

  const liqImpact = token.liquidityUsd > 100_000 ? "bullish" : token.liquidityUsd < 25_000 ? "bearish" : "neutral";
  factors.push({
    label: "Liquidity Depth",
    detail: `$${(token.liquidityUsd / 1000).toFixed(1)}K pool liquidity`,
    impact: liqImpact,
    weight: token.liquidityUsd > 100_000 ? 22 : 12,
  });

  if (intel.marketCap || token.marketCap) {
    const mc = intel.marketCap ?? token.marketCap ?? 0;
    factors.push({
      label: "Market Cap",
      detail: mc >= 1_000_000 ? `$${(mc / 1_000_000).toFixed(2)}M` : `$${(mc / 1000).toFixed(0)}K`,
      impact: mc > 500_000 ? "bullish" : mc < 50_000 ? "bearish" : "neutral",
      weight: 15,
    });
  }

  if (intel.sniperCount !== undefined && intel.sniperCount > 0) {
    factors.push({
      label: "Sniper Activity",
      detail: `${intel.sniperCount} sniper wallets (Birdeye)`,
      impact: intel.sniperCount > 10 ? "bearish" : intel.sniperCount > 3 ? "neutral" : "bullish",
      weight: intel.sniperCount * 2,
    });
  }

  if (intel.holderCount && intel.holderCount > 0) {
    factors.push({
      label: "Holder Base",
      detail: `${intel.holderCount.toLocaleString()} unique holders`,
      impact: intel.holderCount > 1000 ? "bullish" : intel.holderCount < 100 ? "bearish" : "neutral",
      weight: 10,
    });
  }

  if (intel.top10HolderPercent !== undefined) {
    factors.push({
      label: "Concentration Risk",
      detail: `Top 10 wallets hold ${intel.top10HolderPercent.toFixed(1)}%`,
      impact: intel.top10HolderPercent > 40 ? "bearish" : "neutral",
      weight: intel.top10HolderPercent > 40 ? 20 : 8,
    });
  }

  if (token.txns24h) {
    const ratio = token.txns24h.buys / Math.max(token.txns24h.sells, 1);
    factors.push({
      label: "Buy/Sell Flow",
      detail: `${token.txns24h.buys} buys vs ${token.txns24h.sells} sells (24h)`,
      impact: ratio > 1.2 ? "bullish" : ratio < 0.8 ? "bearish" : "neutral",
      weight: 14,
    });
  }

  if (intel.isMintable || intel.isFreezable) {
    factors.push({
      label: "Contract Risk",
      detail: `${intel.isMintable ? "Mintable" : "No mint"} · ${intel.isFreezable ? "Freezable" : "No freeze"}`,
      impact: intel.isMintable || intel.isFreezable ? "bearish" : "bullish",
      weight: 18,
    });
  }

  if (intel.technical) {
    const ta = intel.technical;
    const taLabel = ta.taSource === "birdeye_ohlcv" ? "Birdeye TA" : "TA";
    factors.push({
      label: `${taLabel} · RSI (${ta.rsi.toFixed(0)})`,
      detail: `${ta.rsiSignal} · ${ta.rsi > 70 ? "overbought zone" : ta.rsi < 30 ? "oversold bounce setup" : "neutral momentum"}`,
      impact: ta.rsiSignal === "oversold" ? "bullish" : ta.rsiSignal === "overbought" ? "bearish" : "neutral",
      weight: 16,
    });
    factors.push({
      label: "MACD",
      detail: `${ta.macdSignal} crossover · histogram ${ta.macd >= 0 ? "+" : ""}${ta.macd}`,
      impact: ta.macdSignal === "bullish" ? "bullish" : ta.macdSignal === "bearish" ? "bearish" : "neutral",
      weight: 18,
    });
    factors.push({
      label: "Trend",
      detail: ta.trendLine,
      impact: ta.trend.includes("up") ? "bullish" : ta.trend.includes("down") ? "bearish" : "neutral",
      weight: 20,
    });
  }

  if (intel.insiderCount && intel.insiderCount > 3) {
    factors.push({
      label: "Insider Risk",
      detail: `${intel.insiderCount} insider wallets with large allocations`,
      impact: "bearish",
      weight: 22,
    });
  }

  if (token.fdv && token.fdv > 0) {
    factors.push({
      label: "FDV",
      detail: `$${token.fdv >= 1e6 ? `${(token.fdv / 1e6).toFixed(2)}M` : `${(token.fdv / 1e3).toFixed(0)}K`} fully diluted valuation`,
      impact: token.fdv < 500_000 ? "bearish" : token.fdv > 5_000_000 ? "bullish" : "neutral",
      weight: 12,
    });
  }

  if (token.liquidityUsd > 0 && token.volume24h > 0) {
    const turnover = token.volume24h / token.liquidityUsd;
    factors.push({
      label: "24h Turnover",
      detail: `${turnover.toFixed(2)}× volume vs liquidity (higher = more active)`,
      impact: turnover > 1.5 ? "bullish" : turnover < 0.3 ? "bearish" : "neutral",
      weight: 14,
    });
  }

  if (intel.sell24h && intel.buy24h) {
    const ratio = intel.buy24h / Math.max(intel.sell24h, 1);
    factors.push({
      label: "On-chain Flow",
      detail: `${intel.buy24h} buys vs ${intel.sell24h} sells (24h)`,
      impact: ratio > 1.2 ? "bullish" : ratio < 0.8 ? "bearish" : "neutral",
      weight: 16,
    });
  }

  const lc = intel.social?.lunarcrush;
  if (lc?.degraded) {
    factors.push({
      label: "Social (LunarCrush)",
      detail: lc.reason ?? "Subscription required",
      impact: "neutral",
      weight: 4,
    });
  } else if (lc?.galaxyScore != null) {
    factors.push({
      label: "Social Galaxy Score",
      detail: `LunarCrush ${lc.galaxyScore}${lc.sentiment != null ? ` · sentiment ${lc.sentiment}` : ""}`,
      impact: lc.galaxyScore >= 65 ? "bullish" : lc.galaxyScore < 40 ? "bearish" : "neutral",
      weight: lc.galaxyScore >= 65 ? 14 : 8,
    });
  }

  const rd = intel.social?.reddit;
  if (rd?.topTitle) {
    factors.push({
      label: "Reddit buzz",
      detail: `r/${rd.subreddit ?? "crypto"}: ${rd.topTitle.slice(0, 90)}`,
      impact: "bullish",
      weight: 12,
    });
  }

  const fc = intel.social?.farcaster;
  if (fc?.topCast) {
    factors.push({
      label: "Farcaster Buzz",
      detail: `@${fc.author ?? "user"}: ${fc.topCast.slice(0, 80)}`,
      impact: "bullish",
      weight: 10,
    });
  } else if (fc?.degraded && fc.reason) {
    factors.push({
      label: "Farcaster",
      detail: fc.reason,
      impact: "neutral",
      weight: 3,
    });
  }

  return factors;
}

function normalizePct(n: number | undefined, fallback: number) {
  if (n == null || Number.isNaN(n)) return fallback;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.round(Math.min(100, Math.max(0, n)));
}

function scoreFactorEdge(factors: ReasoningFactor[]) {
  let bull = 0;
  let bear = 0;
  for (const f of factors) {
    const w = f.weight ?? 10;
    if (f.impact === "bullish") bull += w;
    else if (f.impact === "bearish") bear += w;
  }
  return { bull, bear, edge: bull - bear };
}

function buildWhyAction(
  action: NexusDecision["action"],
  token: TrendingToken,
  factors: ReasoningFactor[],
  edge: number,
): string {
  const top = [...factors].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 3);
  const cites = top.map((f) => `${f.label} (${f.detail})`).join("; ");

  if (action === "HOLD") {
    return `${token.symbol} @ ${token.priceUsd < 1 ? token.priceUsd.toFixed(4) : `$${token.priceUsd.toFixed(2)}`}: ${cites}. Net edge ${edge > 0 ? "+" : ""}${edge.toFixed(0)} — mixed tape, no high-conviction entry.`;
  }
  if (action === "BUY") {
    return `${token.symbol}: ${cites}. Bullish edge +${edge.toFixed(0)} with ${token.change24h >= 0 ? "+" : ""}${token.change24h.toFixed(1)}% 24h — tactical long while liquidity supports size.`;
  }
  return `${token.symbol}: ${cites}. Bearish edge ${edge.toFixed(0)} after ${token.change24h.toFixed(1)}% 24h move — trim risk before deeper drawdown.`;
}

function heuristicDecision(
  token: TrendingToken,
  intel: TokenIntel,
  macro?: MacroRegime | null,
): Pick<
  NexusDecision,
  | "action"
  | "confidence"
  | "riskScore"
  | "reasoning"
  | "whyAction"
  | "reasoningFactors"
> {
  const draftFactors = buildReasoningFactors(token, intel, "HOLD", macro);
  const { edge } = scoreFactorEdge(draftFactors);
  const ta = intel.technical;
  const taScore = ta?.score ?? 50;

  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  const flowRatio = (token.txns24h?.buys ?? intel.buy24h ?? 0) / Math.max(token.txns24h?.sells ?? intel.sell24h ?? 1, 1);
  const m5 = token.priceChange?.m5 ?? 0;
  const h1 = token.priceChange?.h1 ?? 0;
  const crimeDump = m5 <= -25 || h1 <= -35;
  const pumpDump = token.change24h > 8 && (m5 < -15 || h1 < -20);

  let action: NexusDecision["action"] = "HOLD";
  if (crimeDump || pumpDump) {
    action = "SELL";
  } else if (edge > 28 && taScore >= 58 && token.liquidityUsd > 40_000 && flowRatio > 1.05) {
    action = "BUY";
  } else if (edge < -22 || taScore < 42 || token.change24h < -18) {
    action = "SELL";
  } else if (edge > 18 && token.change24h > 12 && token.liquidityUsd > 80_000) {
    action = "BUY";
  } else if (edge < -14 && (intel.sniperCount ?? 0) > 6) {
    action = "SELL";
  } else if (Math.abs(token.change24h) > 25 && turnover > 2) {
    action = token.change24h > 0 ? "BUY" : "SELL";
  }

  const finalFactors = buildReasoningFactors(token, intel, action, macro);
  const { edge: finalEdge } = scoreFactorEdge(finalFactors);

  const confidence = Math.round(
    Math.min(
      94,
      Math.max(
        36,
        44 +
          Math.abs(finalEdge) * 0.55 +
          (taScore - 50) * 0.35 +
          Math.min(12, turnover * 4) +
          (flowRatio > 1.3 ? 6 : flowRatio < 0.7 ? -6 : 0) +
          (action === "BUY" && token.change24h > 0 ? token.change24h * 0.15 : 0) +
          (action === "SELL" && token.change24h < 0 ? Math.abs(token.change24h) * 0.12 : 0),
      ),
    ),
  );

  const riskScore = Math.round(
    Math.min(
      92,
      Math.max(
        12,
        48 -
          finalEdge * 0.4 +
          (token.liquidityUsd < 25_000 ? 18 : token.liquidityUsd < 80_000 ? 8 : -4) +
          (intel.sniperCount ?? 0) * 1.8 +
          (intel.top10HolderPercent ?? 0) * 0.25 +
          (intel.isMintable ? 10 : 0) +
          (intel.isFreezable ? 12 : 0) +
          (turnover > 8 ? 6 : 0),
      ),
    ),
  );

  const top = [...finalFactors].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 4);
  const reasoning = top.map((f) => `${f.label}: ${f.detail}`).join(" · ");

  return {
    action,
    confidence,
    riskScore,
    reasoning,
    whyAction: buildWhyAction(action, token, finalFactors, finalEdge),
    reasoningFactors: finalFactors,
  };
}

async function enrichToken(token: TrendingToken, deep = true) {
  if (token.intel?.technical && !deep) return token.intel;
  if (deep) {
    const bundle = await buildDeepTokenIntel(token);
    return bundle.intel;
  }
  return token.intel ?? buildLocalTokenIntel(token);
}

async function aiDecision(token: TrendingToken, intel: TokenIntel) {
  const client = getAiClient();
  const fallback = heuristicDecision(token, intel);

  if (!client) return fallback;

  const bundle = await buildDeepTokenIntel(token);
  const intelMerged = { ...intel, ...bundle.intel };

  try {
    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are NEXUS, a professional crypto trading agent. Each token analysis MUST be unique — cite specific numbers from the payload (price, % change, liquidity, volume, RSI, MACD, news headlines). If 5m or 1h price change shows a crime dump or pump-then-dump while 24h is still positive, you MUST return SELL with confidence under 40 — never HOLD or BUY on obvious rugs/honeypots. Never reuse the same confidence/risk for different tokens. Return JSON: action (BUY|SELL|HOLD), confidence (0-100), riskScore (0-100), reasoning (2-3 sentences with unique metrics), whyAction (one sentence naming this token's edge).",
        },
        {
          role: "user",
          content: JSON.stringify({
            token,
            intel: intelMerged,
            turnoverRatio: bundle.turnoverRatio,
            buySellRatio: bundle.buySellRatio,
            headlines: bundle.news,
            community: bundle.community.headlines,
            social: bundle.social,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      action?: NexusDecision["action"];
      confidence?: number;
      riskScore?: number;
      reasoning?: string;
      whyAction?: string;
    };

    const action = parsed.action ?? fallback.action;
    const factors = buildReasoningFactors(token, intelMerged, action);
    const { edge } = scoreFactorEdge(factors);

    return {
      action,
      confidence: normalizePct(parsed.confidence, fallback.confidence),
      riskScore: normalizePct(parsed.riskScore, fallback.riskScore),
      reasoning: parsed.reasoning ?? fallback.reasoning,
      whyAction: parsed.whyAction ?? buildWhyAction(action, token, factors, edge),
      reasoningFactors: factors,
    };
  } catch (error) {
    console.warn("OpenAI unavailable:", error);
    return fallback;
  }
}

export async function buildDecision(token: TrendingToken, arcFeeTxHash?: string): Promise<NexusDecision> {
  const swapCheck = checkSwappable(token);
  const intel = await enrichToken(token, true);
  const { scoreTokenSecurity } = await import("./token-security");
  const security = scoreTokenSecurity(token, intel);
  const scam = assessTokenScam(token, intel, security);
  const coreRaw = await aiDecision(token, intel);
  const core = applyScamAndSecurity(token, intel, coreRaw, security, scam);
  const payload = JSON.stringify({ product: "NEXUS", token: token.tokenAddress, ...core });
  const anchor = await anchorDecisionPayload(payload);

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    token: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    chainId: token.chainId,
    pairAddress: token.pairAddress,
    dexUrl: token.url,
    icon: token.icon,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    intel,
    swappable: swapCheck.ok,
    swapCriteriaMet: swapCheck.reasons,
    ...core,
    arcTxHash: anchor.txHash ?? arcFeeTxHash,
    arcBlockNumber: anchor.blockNumber,
    arcFeeTxHash,
    settlementNetwork: "Arc Testnet",
    feeCurrency: "USDC",
    technical: intel.technical,
  };
}

async function refreshTokenFromDex(token: TrendingToken): Promise<TrendingToken> {
  const fresh = await fetchTokenByAddress(token.chainId, token.tokenAddress);
  if (!fresh) return token;
  return { ...token, ...fresh, intel: token.intel };
}

async function analyzeTokenForMemoryScan(token: TrendingToken) {
  const { scoreTokenSecurity } = await import("./token-security");
  const fresh = await refreshTokenFromDex(token);
  const bundle = await buildDeepTokenIntel(fresh);
  const intel = bundle.intel;
  const security = scoreTokenSecurity(fresh, intel);
  const scam = assessTokenScam(fresh, intel, security);
  if (scam.isScam) {
    security.scamRisk = true;
    security.scamLabel = scam.label;
    security.scamType = scam.scamType ?? undefined;
    security.honeypotRisk = security.honeypotRisk || scam.severity >= 50;
    security.label = scam.label;
    security.flags = [...new Set([...security.flags, ...scam.flags])].slice(0, 8);
  }
  const macro = await getMacroRegime();
  let signal = heuristicDecision(fresh, intel, macro);
  signal = applyScamAndSecurity(fresh, intel, signal, security, scam);
  return {
    token: { ...fresh, intel },
    intel,
    signal,
    security,
    scam,
    news: bundle.news,
    social: bundle.social,
    community: bundle.community,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export type AlphaOpportunity = {
  rank: number;
  symbol: string;
  name: string;
  tokenAddress: string;
  chainId: string;
  priceUsd: number;
  change24h: number;
  action: AgentSignal["action"];
  confidence: number;
  opportunityScore: number;
  reasoning: string;
  whyAction: string;
  newsHeadlines: string[];
  socialBuzz?: string;
  galaxyScore?: number;
  socialDegraded?: string;
  liquidityUsd: number;
  volume24h: number;
};

function scoreOpportunity(
  token: TrendingToken,
  signal: AgentSignal,
  intel: TokenIntel,
  social?: TokenSocialIntel,
  newsCount = 0,
): number {
  let score = signal.confidence;
  if (signal.action === "BUY") score += 22;
  else if (signal.action === "HOLD") score += 4;
  else score -= 18;
  if (intel.technical?.score) score += intel.technical.score * 0.15;
  if (token.liquidityUsd > 150_000) score += 12;
  else if (token.liquidityUsd > 50_000) score += 6;
  if (token.change24h > 5 && token.change24h < 80) score += 8;
  if ((token.txns24h?.buys ?? 0) > (token.txns24h?.sells ?? 1)) score += 6;
  if (newsCount > 0) score += 6;
  if (social?.lunarcrush?.galaxyScore && social.lunarcrush.galaxyScore >= 60) score += 8;
  if ((social?.reddit.length ?? 0) > 0) score += 5;
  if (social?.hasData) score += 4;
  score -= Math.min(40, signal.riskScore * 0.35);
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Memory scan — deep intel archive (20 tokens) for Agent Memory tab */
export async function runNexusScan(limit = 20, preferredChain?: string, arcFeeTxHash?: string) {
  const { filterTradableTokens } = await import("./token-filters");
  const { fetchStableMarketFeed } = await import("./dexscreener");
  const raw = await fetchStableMarketFeed(Math.min(limit * 2, 40));
  const tokens = filterTradableTokens(raw).slice(0, Math.min(limit, 20));
  if (tokens.length === 0) {
    throw new Error("No tradable tokens found (stablecoins excluded). Check DexScreener connection.");
  }

  const analyzed = await mapWithConcurrency(tokens, analyzeTokenForMemoryScan, 4);
  const anchor = arcFeeTxHash
    ? await anchorDecisionPayload(JSON.stringify({ product: "NEXUS", scan: Date.now(), count: tokens.length }))
    : { txHash: undefined as string | undefined, blockNumber: undefined as number | undefined };

  const decisions: NexusDecision[] = [];
  for (const { token, intel, signal } of analyzed) {
    const swapCheck = checkSwappable(token);
    const decision: NexusDecision = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      token: token.tokenAddress,
      symbol: token.symbol,
      name: token.name,
      chainId: token.chainId,
      pairAddress: token.pairAddress,
      dexUrl: token.url,
      icon: token.icon,
      priceUsd: token.priceUsd,
      change24h: token.change24h,
      volume24h: token.volume24h,
      liquidityUsd: token.liquidityUsd,
      intel,
      swappable: swapCheck.ok,
      swapCriteriaMet: swapCheck.reasons,
      action: signal.action,
      confidence: signal.confidence,
      riskScore: signal.riskScore,
      reasoning: signal.reasoning,
      whyAction: signal.whyAction,
      reasoningFactors: signal.reasoningFactors,
      arcTxHash: anchor.txHash ?? arcFeeTxHash,
      arcBlockNumber: anchor.blockNumber,
      arcFeeTxHash,
      settlementNetwork: "Arc Testnet",
      feeCurrency: "USDC",
      technical: intel.technical,
    };
    await addNexusDecision(decision);
    decisions.push(decision);
  }

  return {
    tokens,
    decisions,
    count: decisions.length,
    scanMode: "memory" as const,
    criteria: "memory-20|dexscreener|birdeye|news|meme-news|scam-check|ta|macro",
  };
}

/** Alpha scan — rank up to 30 opportunities (news + meme headlines + on-chain + AI) */
export async function runAlphaScan(
  limit = 30,
  opts?: { preferredChain?: string; focusToken?: TrendingToken },
) {
  const { filterTradableTokens } = await import("./token-filters");
  const { fetchStableMarketFeed, fetchTokenByAddress } = await import("./dexscreener");

  let tokens: TrendingToken[] = filterTradableTokens(
    await fetchStableMarketFeed(Math.min(limit * 2, 45)),
  ).slice(0, limit);

  if (opts?.focusToken) {
    const focus = opts.focusToken;
    const key = `${focus.chainId}:${focus.tokenAddress.toLowerCase()}`;
    const loaded = await fetchTokenByAddress(focus.chainId, focus.tokenAddress);
    const fresh: TrendingToken = {
      ...focus,
      ...loaded,
      intel: focus.intel ?? loaded?.intel ?? buildLocalTokenIntel(loaded ?? focus),
    };
    tokens = [fresh, ...tokens.filter((t) => `${t.chainId}:${t.tokenAddress.toLowerCase()}` !== key)].slice(
      0,
      limit,
    );
  }

  if (tokens.length === 0) {
    throw new Error("No tradable tokens for alpha scan. Check DexScreener connection.");
  }

  const analyzed = await mapWithConcurrency(tokens, analyzeTokenForMemoryScan, 3);

  const opportunities: AlphaOpportunity[] = analyzed
    .map(({ token, intel, signal, news, social, community }) => {
      const socialHeadline = pickCommunityBuzz(community, news.map((n) => n.title));
      return {
      rank: 0,
      symbol: token.symbol,
      name: token.name,
      tokenAddress: token.tokenAddress,
      chainId: token.chainId,
      priceUsd: token.priceUsd,
      change24h: token.change24h,
      action: signal.action,
      confidence: signal.confidence,
      opportunityScore: scoreOpportunity(token, signal, intel, social),
      reasoning: signal.reasoning,
      whyAction: signal.whyAction,
      newsHeadlines: news.slice(0, 3).map((n) => n.title),
      socialBuzz: socialHeadline,
      galaxyScore: social.lunarcrush?.galaxyScore,
      socialDegraded:
        usePremiumSocialApis() && social.status.lunarcrush === "402"
          ? "Social: LunarCrush subscription required"
          : usePremiumSocialApis()
            ? social.degradedMessage
            : undefined,
      liquidityUsd: token.liquidityUsd,
      volume24h: token.volume24h,
    };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return {
    opportunities,
    count: opportunities.length,
    scanMode: "alpha" as const,
    criteria: "alpha-30|community|news|meme|reddit|birdeye|dexscreener|ta|macro|scam-filter",
    topBuys: opportunities.filter((o) => o.action === "BUY").slice(0, 10),
  };
}

export async function runNexusDecisionForSymbol(
  symbol: string,
  preferredChain?: string,
  arcFeeTxHash?: string,
) {
  const tokens = await fetchSwappableTokens(24, preferredChain);
  const token =
    tokens.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase()) ?? tokens[0];
  if (!token) {
    throw new Error("No swappable tokens available for your wallet chain");
  }

  const decision = await buildDecision(token, arcFeeTxHash);
  await addNexusDecision(decision);
  return decision;
}

export async function getTokenDecision(chainId: string, tokenAddress: string) {
  const { fetchTokenPair } = await import("./dexscreener");
  const token = await fetchTokenPair(chainId, tokenAddress);
  if (!token) throw new Error("Token not found");
  return buildDecision(token);
}

export type { AgentSignal } from "./storage";

export async function analyzeTokenSignal(
  token: TrendingToken,
  intel?: TokenIntel,
  deep = false,
): Promise<AgentSignal> {
  const enriched = intel ?? (await enrichToken(token));
  const { scoreTokenSecurity } = await import("./token-security");
  const security = scoreTokenSecurity(token, enriched);
  const scam = assessTokenScam(token, enriched, security);
  const raw = deep ? await aiDecision(token, enriched) : heuristicDecision(token, enriched);
  return applyScamAndSecurity(token, enriched, raw, security, scam);
}

async function aiFeedBatch(
  batch: { token: TrendingToken; intel: TokenIntel }[],
): Promise<Map<string, AgentSignal>> {
  const out = new Map<string, AgentSignal>();
  const client = getAiClient();
  if (!client || batch.length === 0) return out;

  const payload = batch.map(({ token, intel }) => ({
    symbol: token.symbol,
    chainId: token.chainId,
    priceUsd: token.priceUsd,
    change24h: token.change24h,
    volume24h: token.volume24h,
    liquidityUsd: token.liquidityUsd,
    marketCap: token.marketCap ?? intel.marketCap,
    fdv: token.fdv,
    buys: token.txns24h?.buys,
    sells: token.txns24h?.sells,
    rsi: intel.technical?.rsi,
    macd: intel.technical?.macdSignal,
    trend: intel.technical?.trendLine,
    taScore: intel.technical?.score,
  }));

  try {
    const completion = await client.chat.completions.create({
      model: getAiModel(),
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze EACH token independently. Return JSON { signals: [{ symbol, action, confidence, riskScore, reasoning, whyAction }] } — one row per input symbol. Use different confidence/risk per token based on its metrics. No generic copy-paste.",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      signals?: Array<{
        symbol?: string;
        action?: NexusDecision["action"];
        confidence?: number;
        riskScore?: number;
        reasoning?: string;
        whyAction?: string;
      }>;
    };
    for (const row of parsed.signals ?? []) {
      if (!row.symbol) continue;
      const match = batch.find((b) => b.token.symbol.toUpperCase() === row.symbol!.toUpperCase());
      if (!match) continue;
      const factors = buildReasoningFactors(match.token, match.intel, row.action ?? "HOLD");
      const { edge } = scoreFactorEdge(factors);
      out.set(match.token.tokenAddress.toLowerCase(), {
        action: row.action ?? "HOLD",
        confidence: normalizePct(row.confidence, 50),
        riskScore: normalizePct(row.riskScore, 50),
        reasoning: row.reasoning ?? "",
        whyAction: row.whyAction ?? buildWhyAction(row.action ?? "HOLD", match.token, factors, edge),
        reasoningFactors: factors,
      });
    }
  } catch (e) {
    console.warn("Feed batch AI failed:", e);
  }
  return out;
}

function finalizeFeedSignal(
  token: TrendingToken,
  intel: TokenIntel,
  signal: AgentSignal,
  security: ReturnType<typeof import("./token-security").scoreTokenSecurity>,
) {
  const scam = assessTokenScam(token, intel, security);
  if (scam.isScam) {
    security.scamRisk = true;
    security.scamLabel = scam.label;
    security.scamType = scam.scamType ?? undefined;
    if (scam.severity >= 50) security.honeypotRisk = true;
  }
  return applyScamAndSecurity(token, intel, signal, security, scam);
}

async function intelForFeedRank(token: TrendingToken, rank: number): Promise<TokenIntel> {
  const base = token.intel ?? buildLocalTokenIntel(token);
  if (rank >= 12 || !hasBirdeyeKey()) return base;
  const ta = await resolveTokenTechnical(token);
  return { ...base, technical: technicalToIntel(ta) };
}

/** Fast path: heuristic + security only (no Groq, no Birdeye OHLCV) — must finish under Vercel limits */
export async function analyzeTrendingFeedQuick(tokens: TrendingToken[]) {
  const { scoreTokenSecurity } = await import("./token-security");
  const macro = await getMacroRegime();
  return Promise.all(
    tokens.map(async (token) => {
    const intel = token.intel ?? buildLocalTokenIntel(token);
    const security = scoreTokenSecurity(token, intel);
    let signal = heuristicDecision(token, intel, macro);
    signal = finalizeFeedSignal(token, intel, signal, security);
    return { token: { ...token, intel }, intel, signal, security };
  }),
  );
}

/** Batch analyze trending tokens — unique scoring + AI on top-volume slice */
export async function analyzeTrendingFeed(tokens: TrendingToken[]) {
  const { scoreTokenSecurity } = await import("./token-security");
  const macro = await getMacroRegime();
  const sorted = [...tokens].sort((a, b) => b.volume24h - a.volume24h);
  const rankOf = new Map(
    sorted.map((t, i) => [`${t.chainId}:${t.tokenAddress.toLowerCase()}`, i]),
  );
  const cycle = Math.floor(Date.now() / 45_000);
  const aiCap = getAiClient() ? 10 : 0;
  const aiMap = new Map<string, AgentSignal>();

  if (aiCap > 0) {
    const pool = sorted.slice(0, 36).map((token) => ({
      token,
      intel: token.intel ?? buildLocalTokenIntel(token),
    }));
    const offset = (cycle % 3) * 6;
    const rotated = [...pool.slice(offset), ...pool.slice(0, offset)].slice(0, aiCap);
    const chunks: (typeof pool)[] = [];
    for (let i = 0; i < rotated.length; i += 6) chunks.push(rotated.slice(i, i + 6));

    const maps = await Promise.all(chunks.map((chunk) => aiFeedBatch(chunk)));
    for (const m of maps) m.forEach((v, k) => aiMap.set(k, v));
  }

  return Promise.all(
    tokens.map(async (token) => {
      const rank = rankOf.get(`${token.chainId}:${token.tokenAddress.toLowerCase()}`) ?? 99;
      const intel = await intelForFeedRank(token, rank);
      const key = token.tokenAddress.toLowerCase();
      let signal = aiMap.get(key) ?? heuristicDecision(token, intel, macro);
      const security = scoreTokenSecurity(token, intel);
      signal = finalizeFeedSignal(token, intel, signal, security);
      return { token: { ...token, intel }, intel, signal, security };
    }),
  );
}
