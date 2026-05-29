/** Short-lived Alpha Scan cache — repeat scans within ~45s return instantly. */

type AlphaCacheEntry = { at: number; payload: Record<string, unknown> };

const cache = new Map<string, AlphaCacheEntry>();

export const ALPHA_SCAN_CACHE_TTL_MS = 45_000;

export function alphaScanCacheKey(liveFeedKeys: string[] = []): string {
  const keys = [...liveFeedKeys].sort().join(",");
  return `alpha:v2:${keys || "default"}`;
}

export function getAlphaScanCache(key: string): Record<string, unknown> | null {
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at > ALPHA_SCAN_CACHE_TTL_MS) return null;
  return hit.payload;
}

export function setAlphaScanCache(key: string, payload: Record<string, unknown>) {
  cache.set(key, { at: Date.now(), payload });
}
