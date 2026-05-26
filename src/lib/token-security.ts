import type { TrendingToken } from "./dexscreener";
import type { TokenIntel } from "./storage";

export type TokenSecurityReport = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  label: string;
  honeypotRisk: boolean;
  flags: string[];
  scamRisk?: boolean;
  scamLabel?: string;
  scamType?: string;
};

export function scoreTokenSecurity(
  token: Pick<
    TrendingToken,
    "liquidityUsd" | "volume24h" | "change24h" | "priceUsd" | "priceChange" | "txns24h"
  >,
  intel?: TokenIntel,
): TokenSecurityReport {
  const flags: string[] = [];
  let score = 72;

  if (token.liquidityUsd < 10_000) {
    score -= 25;
    flags.push("Very low liquidity");
  } else if (token.liquidityUsd < 50_000) {
    score -= 12;
    flags.push("Low liquidity");
  }

  if (token.volume24h < 5_000) {
    score -= 10;
    flags.push("Thin volume");
  }

  const turnover = token.liquidityUsd > 0 ? token.volume24h / token.liquidityUsd : 0;
  if (turnover > 50) {
    score -= 8;
    flags.push("Extreme turnover");
  }

  if (intel?.isMintable) {
    score -= 18;
    flags.push("Mintable supply");
  }
  if (intel?.isFreezable) {
    score -= 22;
    flags.push("Freezable transfers");
  }
  if ((intel?.sniperCount ?? 0) > 8) {
    score -= 15;
    flags.push("High sniper wallets");
  }
  if ((intel?.top10HolderPercent ?? 0) > 60) {
    score -= 12;
    flags.push("Concentrated holders");
  }

  const buys = intel?.buy24h ?? 0;
  const sells = intel?.sell24h ?? 0;
  if (sells > buys * 3 && sells > 20) {
    score -= 14;
    flags.push("Sell pressure dominates");
  }

  if (token.change24h < -40) {
    score -= 10;
    flags.push("Heavy 24h dump");
  }

  const m5 = token.priceChange?.m5 ?? 0;
  const h1 = token.priceChange?.h1 ?? 0;
  if (m5 <= -30 || h1 <= -40) {
    score -= 28;
    flags.push(`Intraday dump ${m5.toFixed(0)}% (5m) / ${h1.toFixed(0)}% (1h)`);
  } else if (token.change24h > 8 && (m5 < -15 || h1 < -25)) {
    score -= 22;
    flags.push("Pump-then-dump on chart (positive 24h, collapsing 5m/1h)");
  }

  score = Math.max(0, Math.min(100, score));

  const honeypotRisk =
    (intel?.isMintable && intel?.isFreezable) ||
    (token.liquidityUsd < 5_000 && (intel?.sniperCount ?? 0) > 5) ||
    score < 35;

  const grade: TokenSecurityReport["grade"] =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  const label = honeypotRisk
    ? "High risk — possible honeypot"
    : grade === "A" || grade === "B"
      ? "Security OK"
      : grade === "C"
        ? "Caution advised"
        : "Risky token";

  return { score, grade, label, honeypotRisk, flags };
}

export function mergeFeedTokens<T extends { chainId: string; tokenAddress: string }>(
  existing: T[],
  incoming: T[],
  max = 120,
): T[] {
  const map = new Map<string, T>();
  for (const t of existing) {
    map.set(`${t.chainId}:${t.tokenAddress.toLowerCase()}`, t);
  }
  for (const t of incoming) {
    const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...t } : t);
  }
  return Array.from(map.values())
    .sort((a, b) => {
      const volA = "volume24h" in a ? Number((a as { volume24h?: number }).volume24h ?? 0) : 0;
      const volB = "volume24h" in b ? Number((b as { volume24h?: number }).volume24h ?? 0) : 0;
      return volB - volA;
    })
    .slice(0, max);
}
