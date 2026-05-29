/**
 * GMGN OpenAPI rate budget — serializes calls, caches reads, respects ban cooldown.
 * Prevents RATE_LIMIT_BANNED from parallel probes + feed + alpha hitting the API at once.
 */

const GAP_MS = Math.max(800, Number(process.env.GMGN_MIN_GAP_MS) || 1_500);
const CACHE_TTL_MS =
  Math.max(60_000, (Number(process.env.GMGN_CACHE_MINUTES) || 10) * 60_000);
const BAN_BUFFER_MS = 30_000;

let lastRequestAt = 0;
let banUntilMs = 0;
let queue: Promise<unknown> = Promise.resolve();

const cache = new Map<string, { at: number; value: unknown }>();

export function getGmgnBanStatus(): { banned: boolean; untilMs?: number } {
  const banned = Date.now() < banUntilMs;
  return { banned, untilMs: banned ? banUntilMs : undefined };
}

export function parseGmgnBanUntilMs(error?: string): number | null {
  if (!error || !/rate.?limit|429|banned/i.test(error)) return null;
  const m = error.match(/reset_at["\s:]+(\d+)/i);
  if (m) return Number(m[1]) * 1000 + BAN_BUFFER_MS;
  return Date.now() + 15 * 60_000;
}

export function recordGmgnBanFromError(error?: string): void {
  const until = parseGmgnBanUntilMs(error);
  if (until) banUntilMs = Math.max(banUntilMs, until);
}

export function gmgnCacheKey(prefix: string, parts: Record<string, string | number | undefined>): string {
  const body = Object.entries(parts)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${prefix}:${body}`;
}

export function readGmgnCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= CACHE_TTL_MS) return null;
  return hit.value as T;
}

export function writeGmgnCache<T>(key: string, value: T): void {
  cache.set(key, { at: Date.now(), value });
}

/** One GMGN HTTP call at a time, minimum gap between calls. */
export async function withGmgnQueue<T>(fn: () => Promise<T>): Promise<T> {
  if (Date.now() < banUntilMs) {
    throw new Error("GMGN_RATE_LIMIT_BANNED");
  }

  const job = queue.then(async () => {
    const wait = Math.max(0, GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });

  queue = job.then(
    () => undefined,
    () => undefined,
  );
  return job as Promise<T>;
}

/** Cached read (still goes through queue on miss). */
export async function withGmgnCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = readGmgnCache<T>(key);
  if (hit !== null) return hit;
  const value = await withGmgnQueue(fn);
  writeGmgnCache(key, value);
  return value;
}

/** Run skills one-by-one (never Promise.all). Stops early if banned. */
export async function runGmgnSkillsSequential<T>(
  items: { id: string; run: () => Promise<T> }[],
): Promise<Record<string, T | { error: string }>> {
  const out: Record<string, T | { error: string }> = {};
  for (const item of items) {
    if (Date.now() < banUntilMs) {
      out[item.id] = { error: "GMGN_RATE_LIMIT_BANNED" } as T | { error: string };
      continue;
    }
    try {
      out[item.id] = await withGmgnQueue(item.run);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GMGN skill failed";
      out[item.id] = { error: msg };
      if (msg.includes("BANNED")) break;
    }
  }
  return out;
}
