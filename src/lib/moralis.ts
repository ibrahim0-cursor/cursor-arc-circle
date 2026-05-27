/** Moralis Web3 API — optional token metadata for Alpha / deep intel. */

import { birdeyeChainFor } from "./birdeye-client";

const BASE = "https://deep-index.moralis.io/api/v2.2";

function cleanKey(raw?: string): string | undefined {
  const k = raw?.trim().replace(/^['"]|['"]$/g, "");
  return k && k.length > 20 ? k : undefined;
}

export function hasMoralisKey(): boolean {
  return Boolean(cleanKey(process.env.MORALIS_API_KEY));
}

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
  return map[birdeyeChainFor(chainId)] ?? map[chainId.toLowerCase()] ?? null;
}

export type MoralisTokenMeta = {
  name?: string;
  symbol?: string;
  decimals?: number;
  logo?: string;
};

export async function fetchMoralisTokenMeta(
  chainId: string,
  tokenAddress: string,
): Promise<MoralisTokenMeta | null> {
  const apiKey = cleanKey(process.env.MORALIS_API_KEY);
  const chain = moralisChain(chainId);
  if (!apiKey || !chain) return null;

  const addr = tokenAddress.toLowerCase();
  try {
    const params = new URLSearchParams({ chain, "addresses[0]": addr });
    const res = await fetch(`${BASE}/erc20/metadata?${params}`, {
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Array<{
      name?: string;
      symbol?: string;
      decimals?: number;
      logo?: string;
    }>;
    const row = json[0];
    if (!row) return null;
    return {
      name: row.name,
      symbol: row.symbol,
      decimals: row.decimals,
      logo: row.logo,
    };
  } catch {
    return null;
  }
}

export async function probeMoralis(): Promise<{ ok: boolean; error?: string }> {
  if (!hasMoralisKey()) return { ok: false, error: "MORALIS_API_KEY not set" };
  const meta = await fetchMoralisTokenMeta(
    "base",
    "0x833589fcd6edb6e08f4c7c454b497ef7714d6925",
  );
  return meta ? { ok: true } : { ok: false, error: "metadata request failed" };
}
