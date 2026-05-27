import { fetchTokenByAddress, type TrendingToken } from "./dexscreener";
import { buildDeepTokenIntel } from "./deep-token-analysis";
import { buildLocalTokenIntel } from "./token-intel-local";
import { analyzeTokenSignal } from "./nexus-agent";
import { buildLiveReasoning } from "./nexus-research-dossier";
import { scoreTokenSecurity } from "./token-security";
import type { AgentSignal, TokenIntel } from "./storage";

export type NexusChatContext = {
  token: TrendingToken;
  intel: TokenIntel;
  agent: AgentSignal;
  security: ReturnType<typeof scoreTokenSecurity>;
  reasoningHeadline: string;
  factorLines: string[];
  dataSources: string[];
  refreshedAt: string;
};

/** Fast Dex + heuristic — for chat open and POST (&lt; ~5s). */
export async function buildNexusChatContextLite(
  chainId: string,
  tokenAddress: string,
): Promise<NexusChatContext | null> {
  const token = await fetchTokenByAddress(chainId, tokenAddress);
  if (!token) return null;

  const intel = buildLocalTokenIntel(token);
  const agent = await analyzeTokenSignal(token, intel, false);
  const security = scoreTokenSecurity(token, intel);
  const live = buildLiveReasoning(token, intel, agent);

  return {
    token,
    intel,
    agent,
    security,
    reasoningHeadline: live.headline,
    factorLines: live.factors.slice(0, 4).map((f) => `${f.label}: ${f.detail}`),
    dataSources: ["DexScreener", "Agent heuristics"],
    refreshedAt: new Date().toISOString(),
  };
}

export async function buildNexusChatContext(
  chainId: string,
  tokenAddress: string,
): Promise<NexusChatContext | null> {
  const token = await fetchTokenByAddress(chainId, tokenAddress);
  if (!token) return null;

  const bundle = await buildDeepTokenIntel(token, { scanKind: "analyze", tokenIndex: 0 });
  const intel = bundle.intel;
  const agent = await analyzeTokenSignal(token, intel, false);
  const security = scoreTokenSecurity(token, intel);
  const live = buildLiveReasoning(token, intel, agent);
  const dataSources = ["DexScreener"];
  if (intel.technical?.trendLine?.includes("Birdeye")) dataSources.push("Birdeye OHLCV");
  if (bundle.gmgnLines?.length) dataSources.push("GMGN");

  return {
    token,
    intel,
    agent,
    security,
    reasoningHeadline: live.headline,
    factorLines: live.factors.slice(0, 5).map((f) => `${f.label}: ${f.detail}`),
    dataSources,
    refreshedAt: new Date().toISOString(),
  };
}

export function formatNexusChatContextForAi(ctx: NexusChatContext): string {
  const t = ctx.token;
  const a = ctx.agent;
  const sec = ctx.security;
  const ta = ctx.intel.technical;
  const buys = t.txns24h?.buys ?? ctx.intel.buy24h ?? 0;
  const sells = t.txns24h?.sells ?? ctx.intel.sell24h ?? 0;

  return `VERIFIED LIVE SNAPSHOT (${ctx.refreshedAt}) — sources: ${ctx.dataSources.join(", ")}
TOKEN ${t.symbol} (${t.name ?? t.symbol}) on ${t.chainId}
Contract: ${t.tokenAddress}
Price $${t.priceUsd} · 24h ${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(2)}%
Volume $${Math.round(t.volume24h).toLocaleString()} · Liquidity $${Math.round(t.liquidityUsd).toLocaleString()}
MCAP $${Math.round(t.marketCap ?? 0).toLocaleString()} · FDV $${Math.round(t.fdv ?? 0).toLocaleString()}
24h swaps: ${buys} buys / ${sells} sells
AI signal: ${a.action} · confidence ${a.confidence}% · risk ${a.riskScore}/100
Agent note: ${a.whyAction ?? a.reasoning ?? "n/a"}
Security: ${sec.grade} (${sec.label}) · score ${sec.score}
Technical: RSI ${ta?.rsi?.toFixed?.(0) ?? "n/a"} · MACD ${ta?.macdSignal ?? "n/a"} · trend ${ta?.trend ?? "n/a"} · ${ta?.trendLine ?? ""}
Headline: ${ctx.reasoningHeadline}
Factors:
${ctx.factorLines.map((l) => `- ${l}`).join("\n")}

STRICT: Only cite numbers from this block. If a field is n/a, say data is unavailable — never invent wallets, prices, or TA. Do not link or embed charts (DexScreener, GeckoTerminal, TradingView, Birdeye chart URLs).`;
}

/** Strip chart URLs and markdown embeds from model output */
export function sanitizeChatReply(text: string): string {
  let out = text
    .replace(/https?:\/\/[^\s]*(?:dexscreener|geckoterminal|birdeye\.so\/token|tradingview)[^\s]*/gi, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!out) {
    out = "I can only answer from live market data in context — try asking about price, liquidity, or the current signal.";
  }
  return out;
}
