import { birdeyeChainFor, birdeyeFetchJson, hasBirdeyeKey, normalizeTokenAddress } from "./birdeye-client";

export type OhlcvCandle = { open: number; high: number; low: number; close: number; volume?: number };

/** Birdeye OHLCV — used for RSI/MACD from real candles (not Dex % deltas). */
export async function fetchBirdeyeOhlcv(
  address: string,
  sourceChain: string,
  type: "15m" | "1H" = "1H",
  hoursBack = 48,
): Promise<OhlcvCandle[]> {
  if (!hasBirdeyeKey()) return [];

  const chain = birdeyeChainFor(sourceChain);
  const addr = normalizeTokenAddress(address, chain);
  const now = Math.floor(Date.now() / 1000);
  const time_from = now - hoursBack * 3600;

  const res = await birdeyeFetchJson<{
    data?: { items?: Array<{ o?: number; h?: number; l?: number; c?: number; v?: number }> };
  }>(
    `/defi/ohlcv?address=${encodeURIComponent(addr)}&type=${type}&currency=usd&time_from=${time_from}&time_to=${now}`,
    chain,
  );

  if (!res.ok || !res.data?.data?.items?.length) return [];

  return res.data.data.items
    .map((c) => ({
      open: c.o ?? 0,
      high: c.h ?? 0,
      low: c.l ?? 0,
      close: c.c ?? 0,
      volume: c.v,
    }))
    .filter((c) => c.close > 0);
}
