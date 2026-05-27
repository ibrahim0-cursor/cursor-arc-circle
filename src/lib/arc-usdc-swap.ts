import { ARC_TESTNET_ID } from "@/lib/arc-chain";
import type { TrendingMarketToken } from "@/components/nexus/nexus-trending-feed";

/** Sentinel — Arc testnet native USDC (wallet balance, not a demo position) */
export const ARC_NATIVE_USDC_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const USDC_ICON =
  "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png";

export function isArcNativeUsdc(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === ARC_NATIVE_USDC_ADDRESS.toLowerCase();
}

export function createArcUsdcSwapToken(): TrendingMarketToken {
  return {
    symbol: "USDC",
    name: "Arc Testnet USDC",
    tokenAddress: ARC_NATIVE_USDC_ADDRESS,
    chainId: String(ARC_TESTNET_ID),
    pairAddress: "",
    priceUsd: 1,
    change24h: 0,
    volume24h: 0,
    liquidityUsd: 0,
    icon: USDC_ICON,
    url: "https://testnet.arcscan.app",
    demoTradeable: true,
  };
}

export function mergeSwapTokenList(
  feed: TrendingMarketToken[],
  alphaRows?: Array<{
    symbol: string;
    name: string;
    tokenAddress: string;
    chainId: string;
    priceUsd: number;
    change24h: number;
    icon?: string;
  }>,
): TrendingMarketToken[] {
  const byKey = new Map<string, TrendingMarketToken>();
  const add = (t: TrendingMarketToken) => {
    byKey.set(`${t.chainId}:${t.tokenAddress}`.toLowerCase(), t);
  };
  for (const t of feed) add(t);
  for (const row of alphaRows ?? []) {
    add({
      symbol: row.symbol,
      name: row.name,
      tokenAddress: row.tokenAddress,
      chainId: row.chainId,
      pairAddress: "",
      priceUsd: row.priceUsd,
      change24h: row.change24h,
      volume24h: 0,
      liquidityUsd: 0,
      icon: row.icon,
      url: `https://dexscreener.com/${row.chainId}/${row.tokenAddress}`,
      demoTradeable: true,
    });
  }
  add(createArcUsdcSwapToken());
  return [...byKey.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}
