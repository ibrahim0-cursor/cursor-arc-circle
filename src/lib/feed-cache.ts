/** In-memory feed cache — warm hits within the same server instance. */

type FeedCacheEntry = { at: number; payload: Record<string, unknown> };

const feedCache = new Map<string, FeedCacheEntry>();

export const FEED_QUICK_TTL_MS = 20_000;
export const FEED_FULL_TTL_MS = 45_000;
export const FEED_STALE_MS = 90_000;

export function getFeedCache(key: string, ttlMs: number): Record<string, unknown> | null {
  const hit = feedCache.get(key);
  if (!hit || Date.now() - hit.at > ttlMs) return null;
  return hit.payload;
}

/** Return stale payload for background revalidation (still within extended window). */
export function getStaleFeedCache(key: string): Record<string, unknown> | null {
  const hit = feedCache.get(key);
  if (!hit || Date.now() - hit.at > FEED_STALE_MS) return null;
  return hit.payload;
}

export function setFeedCache(key: string, payload: Record<string, unknown>) {
  feedCache.set(key, { at: Date.now(), payload });
}

export function feedCacheKey(quick: boolean, limit: number) {
  return `feed:v7:${quick ? "q" : "f"}:${limit}`;
}
