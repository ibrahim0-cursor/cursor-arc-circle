/**
 * When to call Birdeye (rate-limited). DexScreener + GMGN cover most feed/scan needs.
 */

import { hasBirdeyeKey } from "./birdeye-client";

export type BirdeyeScanKind = "memory" | "alpha" | "analyze" | "feed";

export type BirdeyeUsagePlan = {
  /** whales-only vs full detection stack */
  detection: "off" | "lite" | "full";
  ohlcv: boolean;
};

/** Max archived decisions in UI + localStorage */
export const SAVED_SCANS_MAX = 15;

const MEMORY_DETECTION_SLOTS = 8;
const MEMORY_OHLCV_SLOTS = 4;
const ALPHA_DETECTION_SLOTS = 10;
const ALPHA_OHLCV_SLOTS = 8;
const FEED_OHLCV_SLOTS = 5;

export function getBirdeyePlan(
  kind: BirdeyeScanKind,
  tokenIndex = 0,
): BirdeyeUsagePlan {
  if (!hasBirdeyeKey()) {
    return { detection: "off", ohlcv: false };
  }

  switch (kind) {
    case "analyze":
      return { detection: "full", ohlcv: true };
    case "memory":
      return {
        detection: tokenIndex < MEMORY_DETECTION_SLOTS ? "lite" : "off",
        ohlcv: tokenIndex < MEMORY_OHLCV_SLOTS,
      };
    case "alpha":
      return {
        detection: tokenIndex < ALPHA_DETECTION_SLOTS ? "lite" : "off",
        ohlcv: tokenIndex < ALPHA_OHLCV_SLOTS,
      };
    case "feed":
      return {
        detection: "off",
        ohlcv: tokenIndex < FEED_OHLCV_SLOTS,
      };
    default:
      return { detection: "off", ohlcv: false };
  }
}

/** Lower concurrency when Birdeye is active to avoid CU bursts */
export function scanConcurrencyFor(kind: BirdeyeScanKind, defaultConcurrency: number): number {
  if (!hasBirdeyeKey()) return defaultConcurrency;
  if (kind === "memory" || kind === "alpha") return 1;
  return defaultConcurrency;
}
