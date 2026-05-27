/**
 * Resolve token logos from DexScreener, Moralis, or CoinGecko (by contract).
 */

import type { TrendingToken } from "./dexscreener";
import { fetchMoralisTokenMeta, hasMoralisKey } from "./moralis";

const iconCache = new Map<string, string>();

function cacheKey(chainId: string, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

async function coingeckoIcon(chainId: string, address: string): Promise<string | undefined> {
  const platform: Record<string, string> = {
    ethereum: "ethereum",
    eth: "ethereum",
    base: "base",
    arbitrum: "arbitrum",
    polygon: "polygon",
    matic: "polygon",
    bsc: "binance-smart-chain",
    solana: "solana",
  };
  const plat = platform[chainId.toLowerCase()];
  if (!plat) return undefined;

  const key = cacheKey(chainId, address);
  const hit = iconCache.get(`cg:${key}`);
  if (hit) return hit;

  try {
    const apiKey = process.env.COINGECKO_API_KEY?.trim();
    const addr = plat === "solana" ? address : address.toLowerCase();
    const base = `https://api.coingecko.com/api/v3/coins/${plat}/contract/${addr}`;
    const url = apiKey ? `${base}?x_cg_demo_api_key=${encodeURIComponent(apiKey)}` : base;
    const res = await fetch(url, { cache: "force-cache", headers: { Accept: "application/json" } });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { image?: { small?: string; thumb?: string } };
    const icon = json.image?.small ?? json.image?.thumb;
    if (icon) iconCache.set(`cg:${key}`, icon);
    return icon;
  } catch {
    return undefined;
  }
}

export async function enrichTokenIcon<T extends TrendingToken>(token: T): Promise<T> {
  if (token.icon) return token;

  const key = cacheKey(token.chainId, token.tokenAddress);
  const cached = iconCache.get(key);
  if (cached) return { ...token, icon: cached };

  if (hasMoralisKey()) {
    const moralis = await fetchMoralisTokenMeta(token.chainId, token.tokenAddress);
    if (moralis?.logo) {
      iconCache.set(key, moralis.logo);
      return { ...token, icon: moralis.logo, name: moralis.name ?? token.name };
    }
  }

  const cg = await coingeckoIcon(token.chainId, token.tokenAddress);
  if (cg) {
    iconCache.set(key, cg);
    return { ...token, icon: cg };
  }

  return token;
}

export async function enrichTokensWithIcons<T extends TrendingToken>(
  tokens: T[],
  maxLookups = 12,
): Promise<T[]> {
  let lookups = 0;
  const out: T[] = [];
  for (const t of tokens) {
    if (t.icon || lookups >= maxLookups) {
      out.push(t);
      continue;
    }
    lookups++;
    out.push(await enrichTokenIcon(t));
  }
  return out;
}
