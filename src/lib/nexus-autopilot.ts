export type AutopilotInterval =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "12h"
  | "1d"
  | "1w"
  | "custom";

export const AUTOPILOT_INTERVALS: Record<
  Exclude<AutopilotInterval, "custom">,
  { label: string; ms: number }
> = {
  "1m": { label: "1 min", ms: 60_000 },
  "5m": { label: "5 min", ms: 5 * 60_000 },
  "15m": { label: "15 min", ms: 15 * 60_000 },
  "30m": { label: "30 min", ms: 30 * 60_000 },
  "1h": { label: "1 hour", ms: 60 * 60_000 },
  "4h": { label: "4 hours", ms: 4 * 60 * 60_000 },
  "12h": { label: "12 hours", ms: 12 * 60 * 60_000 },
  "1d": { label: "1 day", ms: 24 * 60 * 60_000 },
  "1w": { label: "1 week", ms: 7 * 24 * 60 * 60_000 },
};

export type AutopilotAmountMode = "percent" | "custom_usdc" | "custom_token";

export type AutopilotConfig = {
  enabled: boolean;
  interval: AutopilotInterval;
  customIntervalMinutes: string;
  percent: number;
  amountMode: AutopilotAmountMode;
  customUsdc: string;
  customToken: string;
  customTokenAddress: string;
  customTokenSymbol: string;
  customTokenChain: string;
  customAmountUnit: "tokens" | "usdc";
  mode: "follow_agent" | "buy_only" | "sell_only";
  minConfidence: number;
  tokenKey?: string;
};

export type AutopilotLog = {
  at: string;
  message: string;
  type: "info" | "trade" | "error";
};

const STORAGE_KEY = "nexus-autopilot-v2";

export function defaultAutopilot(): AutopilotConfig {
  return {
    enabled: false,
    interval: "15m",
    customIntervalMinutes: "60",
    percent: 25,
    amountMode: "percent",
    customUsdc: "10",
    customToken: "",
    customTokenAddress: "",
    customTokenSymbol: "",
    customTokenChain: "base",
    customAmountUnit: "tokens",
    mode: "follow_agent",
    minConfidence: 55,
  };
}

export function loadAutopilot(): AutopilotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("nexus-autopilot-v1");
    if (!raw) return defaultAutopilot();
    return { ...defaultAutopilot(), ...JSON.parse(raw) };
  } catch {
    return defaultAutopilot();
  }
}

export function saveAutopilot(config: AutopilotConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function tokenKey(chainId: string, address: string) {
  return `${chainId}:${address.toLowerCase()}`;
}

export function autopilotIntervalMs(config: AutopilotConfig): number {
  if (config.interval === "custom") {
    const minutes = Math.max(1, Math.min(10_080, Number(config.customIntervalMinutes) || 60));
    return minutes * 60_000;
  }
  return AUTOPILOT_INTERVALS[config.interval].ms;
}

export function estimateRequiredUsdc(config: AutopilotConfig, balance: number): number {
  if (config.amountMode === "custom_usdc") {
    return Math.max(0.5, Number(config.customUsdc) || 0) + 0.02;
  }
  if (config.amountMode === "percent") {
    return Math.max(0.5, (balance * config.percent) / 100) + 0.02;
  }
  return 0.52;
}
