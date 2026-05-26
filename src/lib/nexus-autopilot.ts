export type AutopilotInterval = "1m" | "15m" | "1h" | "1d" | "1w";

export const AUTOPILOT_INTERVALS: Record<
  AutopilotInterval,
  { label: string; ms: number; icon: string }
> = {
  "1m": { label: "1 min", ms: 60_000, icon: "⚡" },
  "15m": { label: "15 min", ms: 15 * 60_000, icon: "⏱" },
  "1h": { label: "1 hour", ms: 60 * 60_000, icon: "🕐" },
  "1d": { label: "1 day", ms: 24 * 60 * 60_000, icon: "📅" },
  "1w": { label: "1 week", ms: 7 * 24 * 60 * 60_000, icon: "📆" },
};

export type AutopilotConfig = {
  enabled: boolean;
  interval: AutopilotInterval;
  percent: number;
  mode: "follow_agent" | "buy_only" | "sell_only";
  minConfidence: number;
  tokenKey?: string;
};

export type AutopilotLog = {
  at: string;
  message: string;
  type: "info" | "trade" | "error";
};

const STORAGE_KEY = "nexus-autopilot-v1";

export function defaultAutopilot(): AutopilotConfig {
  return {
    enabled: false,
    interval: "15m",
    percent: 25,
    mode: "follow_agent",
    minConfidence: 55,
  };
}

export function loadAutopilot(): AutopilotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
