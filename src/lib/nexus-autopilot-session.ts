import type { AutopilotConfig, AutopilotScheduleMode } from "@/lib/nexus-autopilot";

export type AutopilotSessionGrant = {
  arcFeeTxHash: string;
  owner: string;
  scheduleMode: AutopilotScheduleMode;
  intervalLabel: string;
  grantedAt: number;
  expiresAt: number;
};

const SESSION_KEY = "nexus-autopilot-session-v1";

/** Recurring agents may run up to 24h on one wallet signature */
const RECURRING_SESSION_MS = 24 * 60 * 60 * 1000;

/** One-time runs: signature valid long enough to finish the first cycle */
const ONCE_SESSION_MS = 15 * 60 * 1000;

export function autopilotSessionExpiryMs(scheduleMode: AutopilotScheduleMode): number {
  return scheduleMode === "once" ? ONCE_SESSION_MS : RECURRING_SESSION_MS;
}

export function buildSessionPayload(cfg: AutopilotConfig, owner: string): string {
  const interval =
    cfg.scheduleMode === "once"
      ? "once"
      : cfg.interval === "custom"
        ? `custom:${cfg.customIntervalMinutes}m`
        : cfg.interval;
  return `${owner.toLowerCase()}|${cfg.scheduleMode}|${interval}|${cfg.mode}|${Date.now()}`;
}

export function saveAutopilotSession(session: AutopilotSessionGrant) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadAutopilotSession(): AutopilotSessionGrant | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AutopilotSessionGrant;
  } catch {
    return null;
  }
}

export function clearAutopilotSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAutopilotSessionValid(
  session: AutopilotSessionGrant | null,
  owner: string | undefined,
): session is AutopilotSessionGrant {
  if (!session?.arcFeeTxHash || !owner) return false;
  if (session.owner.toLowerCase() !== owner.toLowerCase()) return false;
  return Date.now() < session.expiresAt;
}

export function sessionIntervalLabel(cfg: AutopilotConfig): string {
  if (cfg.scheduleMode === "once") return "one trade";
  if (cfg.interval === "custom") return `${cfg.customIntervalMinutes || "60"} min`;
  const labels: Record<string, string> = {
    "1m": "1 min",
    "5m": "5 min",
    "15m": "15 min",
    "30m": "30 min",
    "1h": "1 hour",
    "4h": "4 hours",
    "12h": "12 hours",
    "1d": "1 day",
    "1w": "1 week",
  };
  return labels[cfg.interval] ?? cfg.interval;
}
