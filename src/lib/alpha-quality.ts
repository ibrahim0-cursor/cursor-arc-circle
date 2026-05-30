import type { TrendingToken } from "./dexscreener";

/** Dex glitches, honeypot bait names, or untradeable rows — drop from Alpha Scan. */
export function isAlphaGlitchOrSpam(t: Pick<
  TrendingToken,
  "symbol" | "name" | "priceUsd" | "change24h" | "liquidityUsd" | "volume24h" | "marketCap" | "fdv"
>): boolean {
  if (!Number.isFinite(t.priceUsd) || t.priceUsd <= 0) return true;
  if (Math.abs(t.change24h) > 900) return true;
  if (t.change24h > 350 && t.liquidityUsd < 250_000) return true;
  if (t.liquidityUsd < 28_000 && t.volume24h < 12_000) return true;
  if (t.volume24h < 8_000 && (t.marketCap ?? t.fdv ?? 0) < 50_000) return true;

  const sym = t.symbol.replace(/^\$/, "").trim().toLowerCase();
  const ambiguous = new Set([
    "base",
    "agent",
    "polymarket",
    "ethereum",
    "eth",
    "btc",
    "usdc",
    "ai",
    "meme",
    "coin",
    "token",
  ]);
  if (ambiguous.has(sym)) {
    const mc = t.marketCap ?? t.fdv ?? 0;
    if (mc < 20_000_000 && t.liquidityUsd < 120_000) return true;
  }
  return false;
}
