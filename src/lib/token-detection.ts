import { fetchTokenDetection } from "./birdeye";
import { hasBirdeyeKey } from "./birdeye-client";
import {
  fetchDexPaprikaToken,
  fetchDexPaprikaTopPool,
  fetchDexPaprikaPoolTxs,
  paprikaToWhales,
  paprikaIntelFromToken,
  dexpaprikaNetwork,
} from "./dexpaprika";
import { fetchTokenByAddress } from "./dexscreener";
import type { TokenTx } from "./storage";

export async function fetchMergedTokenDetection(
  address: string,
  sourceChain: string,
  dexFallback?: { buys: number; sells: number; volume: number },
  opts?: { birdeyeMode?: "off" | "lite" | "full" },
) {
  const birdeye = await fetchTokenDetection(address, sourceChain, {
    mode: opts?.birdeyeMode ?? "full",
  });

  const network = dexpaprikaNetwork(sourceChain);
  let paprikaToken = network ? await fetchDexPaprikaToken(sourceChain, address) : null;
  let paprikaTxs: TokenTx[] = [];

  if (network && paprikaToken) {
    const pool = await fetchDexPaprikaTopPool(sourceChain, address);
    const poolId = pool?.id ?? pool?.address;
    if (poolId) {
      paprikaTxs = await fetchDexPaprikaPoolTxs(sourceChain, poolId, 12);
    }
  }

  const paprikaWhales = paprikaToken ? paprikaToWhales(paprikaToken) : [];
  const paprikaIntel = paprikaToken ? paprikaIntelFromToken(paprikaToken) : null;

  let trades = birdeye.trades.length ? birdeye.trades : paprikaTxs;
  if (!trades.length && dexFallback && (dexFallback.buys > 0 || dexFallback.sells > 0)) {
    const now = new Date().toISOString();
    if (dexFallback.buys > 0) {
      trades.push({
        type: "swap",
        side: "buy",
        amountUsd: dexFallback.volume * 0.55,
        trader: "dex-aggregate",
        timestamp: now,
      });
    }
    if (dexFallback.sells > 0) {
      trades.push({
        type: "swap",
        side: "sell",
        amountUsd: dexFallback.volume * 0.45,
        trader: "dex-aggregate",
        timestamp: now,
      });
    }
  }

  const whales = birdeye.whales.length ? birdeye.whales : paprikaWhales;
  const holders =
    birdeye.holders.length > 0
      ? birdeye.holders
      : whales.slice(0, 12).map((w, i) => ({ ...w, rank: i + 1 }));

  const hasPaprika = Boolean(paprikaToken?.summary?.price_usd);
  const bs = birdeye.summary as {
    birdeyeLive?: boolean;
    holderCount?: number;
    buy24h?: number;
    sell24h?: number;
    priceUsd?: number;
  };
  const birdeyeLive = Boolean(bs.birdeyeLive);
  const mergedLive = birdeyeLive || hasPaprika || trades.length > 0;

  return {
    ...birdeye,
    trades: trades.slice(0, 15),
    whales,
    holders,
    summary: {
      ...birdeye.summary,
      ...(paprikaIntel ?? {}),
      holderCount: bs.holderCount ?? paprikaToken?.summary?.pools,
      buy24h: bs.buy24h ?? paprikaIntel?.buy24h ?? dexFallback?.buys,
      sell24h: bs.sell24h ?? paprikaIntel?.sell24h ?? dexFallback?.sells,
      birdeyeLive: mergedLive,
      dataSource: birdeyeLive
        ? ("birdeye" as const)
        : hasPaprika
          ? ("dexpaprika" as const)
          : trades.length
            ? ("dex" as const)
            : ("unavailable" as const),
      paprikaConnected: hasPaprika,
      priceUsd: bs.priceUsd ?? paprikaIntel?.priceUsd,
    },
    serverHasKey: hasBirdeyeKey(),
    errors:
      mergedLive
        ? undefined
        : [...(birdeye.errors ?? []), "DexPaprika + Birdeye returned no live rows"],
  };
}

export async function enrichTokenWithPair(chainId: string, tokenAddress: string) {
  const pair = await fetchTokenByAddress(chainId, tokenAddress);
  return pair;
}
