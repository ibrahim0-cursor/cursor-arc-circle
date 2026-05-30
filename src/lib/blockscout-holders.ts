/**
 * Blockscout public API — EVM top holders when Birdeye is rate-limited.
 */

import type { TokenWhale } from "./storage";

const EXPLORER_BASE: Record<string, string> = {
  base: "https://base.blockscout.com",
  ethereum: "https://eth.blockscout.com",
  eth: "https://eth.blockscout.com",
  arbitrum: "https://arbitrum.blockscout.com",
  polygon: "https://polygon.blockscout.com",
  optimism: "https://optimism.blockscout.com",
  bsc: "https://bsc.blockscout.com",
};

type BlockscoutHolderItem = {
  address?: { hash?: string };
  value?: string;
  share?: number;
  percentage?: number;
};

export async function fetchBlockscoutTopHolders(
  chainId: string,
  tokenAddress: string,
  limit = 12,
): Promise<TokenWhale[]> {
  const base = EXPLORER_BASE[chainId.toLowerCase()];
  if (!base) return [];

  const addr = tokenAddress.toLowerCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_500);

  try {
    const res = await fetch(`${base}/api/v2/tokens/${addr}/holders`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];

    const json = (await res.json()) as {
      items?: BlockscoutHolderItem[];
      holders?: BlockscoutHolderItem[];
    };
    const items = json.items ?? json.holders ?? [];
    if (!items.length) return [];

    const total = items.reduce((s, h) => s + Number(h.value ?? 0), 0);

    return items.slice(0, limit).map((h, i) => {
      const address = h.address?.hash ?? (h as { hash?: string }).hash ?? "";
      let pct = Number(h.share ?? h.percentage ?? 0);
      if (pct <= 0 && total > 0) {
        pct = (Number(h.value ?? 0) / total) * 100;
      }
      if (pct > 0 && pct <= 1) pct *= 100;
      return {
        address,
        balance: Number(h.value ?? 0),
        pct,
        label: i === 0 ? "Top holder" : i < 3 ? "Major holder" : "Whale",
      };
    }).filter((w) => w.address.length > 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
