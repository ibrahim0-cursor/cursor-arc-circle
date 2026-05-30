/**
 * Moralis token owners — optional EVM holder fallback.
 */

import { hasMoralisKey } from "./moralis";
import type { TokenWhale } from "./storage";

function moralisChain(chainId: string): string | null {
  const map: Record<string, string> = {
    ethereum: "eth",
    eth: "eth",
    base: "base",
    arbitrum: "arbitrum",
    bsc: "bsc",
    polygon: "polygon",
    optimism: "optimism",
    avalanche: "avalanche",
  };
  return map[chainId.toLowerCase()] ?? null;
}

export async function fetchMoralisTopHolders(
  chainId: string,
  tokenAddress: string,
  limit = 12,
): Promise<TokenWhale[]> {
  const apiKey = process.env.MORALIS_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  const chain = moralisChain(chainId);
  if (!hasMoralisKey() || !apiKey || !chain) return [];

  const addr = tokenAddress.toLowerCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_500);

  try {
    const params = new URLSearchParams({
      chain,
      limit: String(limit),
      order: "DESC",
    });
    const res = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${addr}/owners?${params}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json", "X-API-Key": apiKey },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];

    const json = (await res.json()) as {
      result?: Array<{
        owner_address?: string;
        percentage_relative_to_total_supply?: number;
        balance?: string;
      }>;
    };

    return (json.result ?? []).slice(0, limit).map((h, i) => {
      const pct = Number(h.percentage_relative_to_total_supply ?? 0);
      return {
        address: h.owner_address ?? "",
        balance: Number(h.balance ?? 0),
        pct: pct > 0 && pct <= 1 ? pct * 100 : pct,
        label: i === 0 ? "Top holder" : i < 3 ? "Major holder" : "Whale",
      };
    }).filter((w) => w.address.length > 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
