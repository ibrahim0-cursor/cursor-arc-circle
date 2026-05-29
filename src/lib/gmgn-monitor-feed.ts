/**
 * Merge GMGN monitor signals + trades into NEXUS Alpha token feed.
 */

import type { TrendingToken } from "./dexscreener";
import { filterAlphaScanTokens } from "./token-filters";
import { gmgnChainToDexChainId } from "./gmgn-discovery";
import {
  parseSignalEvents,
  runGmgnMonitorSkill,
  type GmgnMonitorSkillId,
} from "./gmgn-monitor";
import { hasGmgnApiKey, type GmgnChain } from "./gmgn-client";
import { gmgnCacheKey, readGmgnCache, writeGmgnCache } from "./gmgn-rate-budget";

function signalToToken(chain: GmgnChain, ev: { tokenAddress: string; symbol?: string }): TrendingToken {
  const chainId = gmgnChainToDexChainId(chain);
  const sym = ev.symbol ?? ev.tokenAddress.slice(0, 6);
  return {
    symbol: sym,
    name: sym,
    tokenAddress: ev.tokenAddress,
    chainId,
    pairAddress: ev.tokenAddress,
    priceUsd: 0,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    url: `https://gmgn.ai/${chain === "sol" ? "sol" : chain}/token/${ev.tokenAddress}`,
  };
}

function tradesToTokens(
  chain: GmgnChain,
  data: unknown,
): TrendingToken[] {
  const list =
    data && typeof data === "object" && Array.isArray((data as { list?: unknown[] }).list)
      ? ((data as { list: Record<string, unknown>[] }).list ?? [])
      : [];
  const out: TrendingToken[] = [];
  for (const row of list) {
    const addr = String(row.base_address ?? "").trim();
    if (!addr) continue;
    const sym = String((row.base_token as { symbol?: string })?.symbol ?? addr.slice(0, 6));
    out.push({
      symbol: sym,
      name: String((row.base_token as { name?: string })?.name ?? sym),
      tokenAddress: addr,
      chainId: gmgnChainToDexChainId(chain),
      pairAddress: addr,
      priceUsd: Number(row.price_usd ?? 0),
      change24h: 0,
      volume24h: Number(row.amount_usd ?? 0),
      liquidityUsd: 0,
      url: `https://gmgn.ai/${chain === "sol" ? "sol" : chain}/token/${addr}`,
    });
  }
  return out;
}

function dedupe(tokens: TrendingToken[]): TrendingToken[] {
  const seen = new Set<string>();
  const out: TrendingToken[] = [];
  for (const t of tokens) {
    const k = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export async function fetchGmgnMonitorTokens(chain: GmgnChain = "sol"): Promise<{
  tokens: TrendingToken[];
  sources: Record<string, number>;
  errors: string[];
}> {
  if (!hasGmgnApiKey()) {
    return { tokens: [], sources: {}, errors: ["GMGN_API_KEY not set"] };
  }

  const skills: GmgnMonitorSkillId[] = [
    "smart-money-buy-signal",
    "price-surge-signal",
    "kol-call-signal",
    "smart-money-trades",
    "kol-trade-activity",
  ];

  const bundleKey = gmgnCacheKey("monitor-bundle", { chain });
  const cached = readGmgnCache<{
    tokens: TrendingToken[];
    sources: Record<string, number>;
    errors: string[];
  }>(bundleKey);
  if (cached) return cached;

  const results: { skill: GmgnMonitorSkillId; res: Awaited<ReturnType<typeof runGmgnMonitorSkill>> }[] =
    [];
  for (const skill of skills) {
    const res = await runGmgnMonitorSkill(skill, {
      chain,
      limit: skill.includes("signal") ? undefined : 25,
      side: skill === "smart-money-trades" || skill === "kol-trade-activity" ? "buy" : undefined,
    });
    results.push({ skill, res });
    if (res.error?.includes("BANNED") || res.error?.includes("RATE_LIMIT")) break;
  }

  const tokens: TrendingToken[] = [];
  const sources: Record<string, number> = {};
  const errors: string[] = [];

  for (const { skill, res } of results) {
    if (!res.ok) {
      if (res.error) errors.push(`${skill}: ${res.error}`);
      continue;
    }
    if (skill.endsWith("-signal")) {
      const events = parseSignalEvents(res.data);
      const mapped = events.map((e) => signalToToken(chain, e));
      sources[skill] = mapped.length;
      tokens.push(...mapped);
    } else {
      const mapped = tradesToTokens(chain, res.data);
      sources[skill] = mapped.length;
      tokens.push(...mapped);
    }
  }

  const bundle = { tokens: filterAlphaScanTokens(dedupe(tokens)), sources, errors };
  writeGmgnCache(bundleKey, bundle);
  return bundle;
}
