import OpenAI from "openai";
import { randomUUID } from "crypto";
import { fetchSwappableTokens, type TrendingToken } from "./dexscreener";
import { checkSwappable } from "./swappable";
import { fetchTokenIntel } from "./birdeye";
import { birdeyeChainFor } from "./testnet-chains";
import { anchorDecisionPayload } from "./arc";
import {
  addNexusDecision,
  type NexusDecision,
  type ReasoningFactor,
  type TokenIntel,
} from "./storage";

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

  if (intel.sniperCount !== undefined) {
    factors.push({
      label: "Sniper Activity",
      detail: `${intel.sniperCount} sniper wallets detected`,
      impact: intel.sniperCount > 10 ? "bearish" : intel.sniperCount > 3 ? "neutral" : "bullish",
      weight: intel.sniperCount * 2,
    });
  }

  if (intel.holderCount) {
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

  if (token.change24h > 8 && token.liquidityUsd > 250_000 && (intel.sniperCount ?? 0) < 8) {
    action = "BUY";
    confidence = 72;
    riskScore = 38;
  } else if (token.change24h < -10 || (intel.sniperCount ?? 0) > 15) {
    action = "SELL";
    confidence = 68;
    riskScore = 62;
  } else if (token.volume24h > 1_000_000 && Math.abs(token.change24h) < 3) {
    action = "HOLD";
    confidence = 61;
    riskScore = 42;
  }

  const finalFactors = buildReasoningFactors(token, intel, action);
  const reasoning =
    action === "BUY"
      ? "Momentum breakout with adequate liquidity. Smart-money flow supports a tactical entry."
      : action === "SELL"
        ? "Bearish momentum or elevated sniper/concentration risk. Capital preservation prioritized."
        : "Mixed signals — no asymmetric edge. Agent stays flat until setup clarifies.";

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
  const birdeyeChain = birdeyeChainFor(token.chainId);
  const { intel } = await fetchTokenIntel(token.tokenAddress, birdeyeChain);
  return {
    ...intel,
    marketCap: intel.marketCap ?? token.marketCap,
    fdv: intel.fdv ?? token.fdv,
  } satisfies TokenIntel;
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

async function buildDecision(token: TrendingToken, arcFeeTxHash?: string): Promise<NexusDecision> {
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
  };
}

export async function runNexusScan(limit = 6, preferredChain?: string, arcFeeTxHash?: string) {
  // Arc wallet: show cross-chain swappable tokens; fees always settle on Arc
  const scanChain = preferredChain === "arc" ? undefined : preferredChain;
  const tokens = await fetchSwappableTokens(limit, scanChain);
  if (tokens.length === 0) {
    throw new Error(
      preferredChain
        ? `No wallet-swappable tokens on ${preferredChain}. Try Base or Ethereum.`
        : "No wallet-swappable tokens found matching liquidity criteria.",
    );
  }

  const decisions: NexusDecision[] = [];
  for (const token of tokens) {
    const decision = await buildDecision(token, arcFeeTxHash);
    await addNexusDecision(decision);
    decisions.push(decision);
  }

  return { tokens, decisions, criteria: preferredChain ?? "arc-settlement|base|ethereum" };
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
