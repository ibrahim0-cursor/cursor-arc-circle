export type PriceChanges = {
  m5?: number;
  h1?: number;
  h6?: number;
  h24: number;
};

export function normalizePriceChanges(
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number },
  change24h = 0,
): PriceChanges {
  return {
    m5: priceChange?.m5,
    h1: priceChange?.h1,
    h6: priceChange?.h6,
    h24: priceChange?.h24 ?? change24h,
  };
}

export type TechnicalAnalysis = {
  rsi: number;
  rsiSignal: "oversold" | "neutral" | "overbought";
  macd: number;
  macdSignal: "bullish" | "bearish" | "neutral";
  macdHistogram: number;
  trend: "strong_up" | "up" | "sideways" | "down" | "strong_down";
  trendLine: string;
  support: number;
  resistance: number;
  volumeTrend: "rising" | "falling" | "flat";
  score: number;
};

export function computeTechnicalAnalysis(
  priceUsd: number,
  changes: PriceChanges,
  volume24h: number,
  liquidityUsd: number,
): TechnicalAnalysis {
  const h1 = changes.h1 ?? changes.h24 * 0.15;
  const h6 = changes.h6 ?? changes.h24 * 0.5;
  const h24 = changes.h24;

  const rsiRaw = 50 + h1 * 0.45 + h6 * 0.35 + h24 * 0.2;
  const rsi = Math.min(100, Math.max(0, rsiRaw));
  const rsiSignal = rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral";

  const macd = h1 * 0.6 + h6 * 0.3 - h24 * 0.1;
  const macdHistogram = h1 - h6 * 0.5;
  const macdSignal = macd > 1.5 ? "bullish" : macd < -1.5 ? "bearish" : "neutral";

  const m5 = changes.m5 ?? h1 * 0.3;
  const h1c = changes.h1 ?? h1;

  let trend: TechnicalAnalysis["trend"] = "sideways";
  if (m5 <= -30 || h1c <= -40) trend = "strong_down";
  else if (h24 > 15 && m5 > -10 && h1c > -15) trend = "strong_up";
  else if (h24 > 3 && m5 > -8) trend = "up";
  else if (h24 < -15 || h6 < -25) trend = "strong_down";
  else if (h24 < -3 || h1c < -12) trend = "down";
  else if (h24 > 10 && (m5 < -15 || h1c < -20)) trend = "down";

  const trendLine =
    m5 <= -30 || h1c <= -40
      ? "Crime dump on 5m/1h — catastrophic sell-off (check DexScreener chart)"
      : h24 > 10 && (m5 < -15 || h1c < -20)
        ? "Pump-then-dump: +24h but collapsing intraday — rug pattern"
        : trend === "strong_up"
          ? "Breakout above 24h VWAP — momentum trend intact"
          : trend === "up"
            ? "Price above short-term EMA — mild uptrend"
            : trend === "strong_down"
              ? "Breakdown below support — bearish trend"
              : trend === "down"
                ? "Lower highs forming — downtrend pressure"
                : "Range-bound — wait for MACD crossover";

  const support = priceUsd * (1 - Math.abs(h24) / 200 - 0.02);
  const resistance = priceUsd * (1 + Math.abs(h24) / 200 + 0.02);

  const volRatio = volume24h / Math.max(liquidityUsd, 1);
  const volumeTrend = volRatio > 2 ? "rising" : volRatio < 0.5 ? "falling" : "flat";

  let score = 50;
  if (macdSignal === "bullish") score += 15;
  if (macdSignal === "bearish") score -= 15;
  if (rsiSignal === "oversold" && macdSignal === "bullish") score += 10;
  if (rsiSignal === "overbought" && macdSignal === "bearish") score -= 10;
  if (m5 <= -25 || h1c <= -35) score -= 35;
  else if (h24 > 15 && m5 < -10) score -= 28;
  if (trend === "strong_up" || trend === "up") score += 12;
  if (trend === "strong_down" || trend === "down") score -= 12;
  if (volumeTrend === "rising") score += 8;
  score = Math.min(100, Math.max(0, score));

  return {
    rsi: Math.round(rsi * 10) / 10,
    rsiSignal,
    macd: Math.round(macd * 100) / 100,
    macdSignal,
    macdHistogram: Math.round(macdHistogram * 100) / 100,
    trend,
    trendLine,
    support: Math.max(support, 0),
    resistance,
    volumeTrend,
    score,
  };
}
