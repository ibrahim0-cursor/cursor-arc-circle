import type { TrendingToken } from "./dexscreener";
import { fetchBirdeyeOhlcv } from "./birdeye-ohlcv";
import { hasBirdeyeKey } from "./birdeye-client";
import {
  computeTechnicalAnalysis,
  normalizePriceChanges,
  type PriceChanges,
  type TechnicalAnalysis,
} from "./technical-analysis";

export type ResolvedTechnical = TechnicalAnalysis & {
  source: "birdeye_ohlcv" | "dexscreener";
};

function rsiFromCloses(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function taFromCandles(
  closes: number[],
  priceUsd: number,
  changes: PriceChanges,
  volume24h: number,
  liquidityUsd: number,
): TechnicalAnalysis {
  const rsi = rsiFromCloses(closes);
  const rsiSignal = rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral";

  const ema12 = ema(closes.slice(-30), 12);
  const ema26 = ema(closes.slice(-30), 26);
  const macd = ema12 - ema26;
  const macdSignal = macd > 0 ? "bullish" : macd < 0 ? "bearish" : "neutral";
  const macdHistogram = macd;

  const last = closes[closes.length - 1] ?? priceUsd;
  const prev = closes[Math.max(0, closes.length - 6)] ?? last;
  const h1Pct = prev > 0 ? ((last - prev) / prev) * 100 : changes.h1 ?? 0;

  const base = computeTechnicalAnalysis(priceUsd, changes, volume24h, liquidityUsd);
  let trend = base.trend;
  if (h1Pct > 5 && rsi < 75) trend = "up";
  if (h1Pct < -5 && rsi > 25) trend = "down";
  if (h1Pct > 12) trend = "strong_up";
  if (h1Pct < -12) trend = "strong_down";

  const trendLine =
    trend === "strong_up"
      ? "Birdeye OHLCV: higher closes + positive MACD — momentum intact"
      : trend === "strong_down"
        ? "Birdeye OHLCV: breakdown on hourly candles — bearish structure"
        : `Birdeye OHLCV: RSI ${rsi.toFixed(0)} · MACD ${macdSignal} on ${closes.length} candles`;

  const support = Math.min(...closes.slice(-12)) * 0.995;
  const resistance = Math.max(...closes.slice(-12)) * 1.005;

  let score = base.score;
  if (rsiSignal === "oversold" && macdSignal === "bullish") score += 8;
  if (rsiSignal === "overbought" && macdSignal === "bearish") score -= 8;
  score = Math.min(100, Math.max(0, score));

  return {
    rsi: Math.round(rsi * 10) / 10,
    rsiSignal,
    macd: Math.round(macd * 10000) / 10000,
    macdSignal,
    macdHistogram: Math.round(macdHistogram * 10000) / 10000,
    trend,
    trendLine,
    support: Math.max(support, 0),
    resistance,
    volumeTrend: base.volumeTrend,
    score,
  };
}

export async function resolveTokenTechnical(
  token: TrendingToken,
): Promise<ResolvedTechnical> {
  const changes = normalizePriceChanges(token.priceChange, token.change24h);

  if (hasBirdeyeKey()) {
    const candles = await fetchBirdeyeOhlcv(token.tokenAddress, token.chainId, "1H", 48);
    const closes = candles.map((c) => c.close).filter((c) => c > 0);
    if (closes.length >= 10) {
      return {
        ...taFromCandles(closes, token.priceUsd, changes, token.volume24h, token.liquidityUsd),
        source: "birdeye_ohlcv",
      };
    }
  }

  return {
    ...computeTechnicalAnalysis(
      token.priceUsd,
      changes,
      token.volume24h,
      token.liquidityUsd,
    ),
    source: "dexscreener",
  };
}

export function technicalToIntel(ta: ResolvedTechnical) {
  return {
    rsi: ta.rsi,
    rsiSignal: ta.rsiSignal,
    macd: ta.macd,
    macdSignal: ta.macdSignal,
    trend: ta.trend,
    trendLine: ta.trendLine,
    score: ta.score,
    taSource: ta.source,
  };
}
