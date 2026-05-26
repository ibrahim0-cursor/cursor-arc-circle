import OpenAI from "openai";
import { randomUUID } from "crypto";
import { fetchTrendingMarketTokens, fetchSwappableTokens, type TrendingToken } from "./dexscreener";
import { buildLocalTokenIntel } from "./token-intel-local";
import { checkSwappable } from "./swappable";
import { anchorDecisionPayload } from "./arc";
import { addNexusDecision, type NexusDecision, type TokenIntel, type AgentSignal, type ReasoningFactor } from "./storage";

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function buildReasoningFactors(
  token: TrendingToken,
  intel: TokenIntel,
  action: NexusDecision["action"],
): ReasoningFactor[] {
  const factors: ReasoningFactor[] = [];

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
    factors.push({
      label: `RSI (${ta.rsi.toFixed(0)})`,
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

  return factors;
}

function buildWhyAction(
  action: NexusDecision["action"],
  token: TrendingToken,
  factors: ReasoningFactor[],
): string {
  const bullish = factors.filter((f) => f.impact === "bullish").length;
  const bearish = factors.filter((f) => f.impact === "bearish").length;

  if (action === "HOLD") {
    return `NEXUS recommends HOLD on ${token.symbol} because signals are mixed (${bullish} bullish vs ${bearish} bearish factors). No clear edge — waiting for momentum or liquidity confirmation before deploying capital.`;
  }
  if (action === "BUY") {
    return `NEXUS recommends BUY on ${token.symbol} because ${bullish} bullish factors outweigh risk (${bearish} bearish). Momentum, liquidity, and flow support a tactical long with defined risk limits.`;
  }
  return `NEXUS recommends SELL on ${token.symbol} because ${bearish} bearish factors dominate. Downside risk from momentum decay, sniper activity, or concentration exceeds reward — reduce exposure now.`;
}

function heuristicDecision(
  token: TrendingToken,
  intel: TokenIntel,
): Pick<
  NexusDecision,
  | "action"
  | "confidence"
  | "riskScore"
  | "reasoning"
  | "whyAction"
  | "reasoningFactors"
> {
  let action: NexusDecision["action"] = "HOLD";
  let confidence = 55;
  let riskScore = 50;

  const factors = buildReasoningFactors(token, intel, action);

  const ta = intel.technical;
  const taScore = ta?.score ?? 50;

  if (taScore > 65 && token.liquidityUsd > 100_000 && (intel.sniperCount ?? 0) < 10) {
    action = "BUY";
    confidence = Math.min(88, 68 + Math.floor((taScore - 50) / 3));
    riskScore = Math.max(20, 45 - Math.floor((taScore - 50) / 4));
  } else if (taScore < 35 || token.change24h < -12 || (intel.sniperCount ?? 0) > 15) {
    action = "SELL";
    confidence = Math.min(85, 65 + Math.floor((50 - taScore) / 4));
    riskScore = Math.min(85, 55 + Math.floor((50 - taScore) / 3));
  } else if (token.change24h > 8 && token.liquidityUsd > 250_000 && (intel.sniperCount ?? 0) < 8) {
    action = "BUY";
    confidence = 72;
    riskScore = 38;
  } else if (token.change24h < -10 || (intel.sniperCount ?? 0) > 15) {
    action = "SELL";
    confidence = 68;
    riskScore = 62;
  } else if (token.volume24h > 500_000 && Math.abs(token.change24h) < 4) {
    action = "HOLD";
    confidence = 61;
    riskScore = 42;
  } else {
    action = "HOLD";
    confidence = 58;
    riskScore = 48;
  }

  const finalFactors = buildReasoningFactors(token, intel, action);
  const reasoning =
    action === "BUY"
      ? `Technical score ${taScore}/100 with ${intel.technical?.macdSignal ?? "neutral"} MACD. Momentum and liquidity support entry.`
      : action === "SELL"
        ? `Technical score ${taScore}/100 — bearish MACD/RSI or elevated sniper/insider risk. Preserve capital.`
        : `Mixed TA (${taScore}/100) — RSI ${intel.technical?.rsi?.toFixed(0) ?? "N/A"}, MACD ${intel.technical?.macdSignal ?? "neutral"}. Wait for clearer edge.`;

  return {
    action,
    confidence,
    riskScore,
    reasoning,
    whyAction: buildWhyAction(action, token, finalFactors),
    reasoningFactors: finalFactors,
  };
}

async function enrichToken(token: TrendingToken) {
  return token.intel ?? buildLocalTokenIntel(token);
}

async function aiDecision(token: TrendingToken, intel: TokenIntel) {
  const client = getOpenAI();
  const fallback = heuristicDecision(token, intel);

  if (!client) return fallback;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are NEXUS trading agent. Return JSON: action (BUY|SELL|HOLD), confidence (0-100), riskScore (0-100), reasoning (2 sentences), whyAction (1 sentence explaining the action plainly).',
        },
        {
          role: "user",
          content: JSON.stringify({ token, intel }),
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
    const factors = buildReasoningFactors(token, intel, action);

    return {
      action,
      confidence: Math.min(100, Math.max(0, parsed.confidence ?? fallback.confidence)),
      riskScore: Math.min(100, Math.max(0, parsed.riskScore ?? fallback.riskScore)),
      reasoning: parsed.reasoning ?? fallback.reasoning,
      whyAction: parsed.whyAction ?? buildWhyAction(action, token, factors),
      reasoningFactors: factors,
    };
  } catch (error) {
    console.warn("OpenAI unavailable:", error);
    return fallback;
  }
}

export async function buildDecision(token: TrendingToken, arcFeeTxHash?: string): Promise<NexusDecision> {
  const swapCheck = checkSwappable(token);
  const intel = await enrichToken(token);
  const core = await aiDecision(token, intel);
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

export async function runNexusScan(limit = 20, preferredChain?: string, arcFeeTxHash?: string) {
  const tokens = await fetchTrendingMarketTokens(limit);
  if (tokens.length === 0) {
    throw new Error("No trending tokens found. Check DexScreener connection.");
  }

  const decisions: NexusDecision[] = [];
  for (const token of tokens) {
    const decision = await buildDecision(token, arcFeeTxHash);
    await addNexusDecision(decision);
    decisions.push(decision);
  }

  return { tokens, decisions, count: decisions.length, criteria: "arc-settlement|dexscreener|birdeye|ta" };
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
  if (deep) return aiDecision(token, enriched);
  return heuristicDecision(token, enriched);
}

/** Batch analyze trending tokens for live agent feed (fast — no Birdeye) */
export async function analyzeTrendingFeed(tokens: TrendingToken[]) {
  return tokens.map((token) => {
    const intel = token.intel ?? buildLocalTokenIntel(token);
    const signal = heuristicDecision(token, intel);
    return { token: { ...token, intel }, intel, signal };
  });
}
