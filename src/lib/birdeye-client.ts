/** Birdeye client: rate limit queue, cache, chain mapping */

let birdeyeQueue: Promise<unknown> = Promise.resolve();
let lastBirdeyeAt = 0;
const BIRDEYE_GAP_MS = 2000;
const CACHE_TTL_MS = 300_000;
const NEGATIVE_CACHE_MS = 45_000;

type CacheEntry<T> = { at: number; data: T };

const responseCache = new Map<string, CacheEntry<unknown>>();

function scheduleBirdeye<T>(fn: () => Promise<T>): Promise<T> {
  const run = birdeyeQueue.then(async () => {
    const wait = Math.max(0, BIRDEYE_GAP_MS - (Date.now() - lastBirdeyeAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastBirdeyeAt = Date.now();
    return fn();
  });
  birdeyeQueue = run.catch(() => undefined);
  return run;
}

function cleanEnvKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const key = raw.trim().replace(/^['"]|['"]$/g, "");
  return key.length >= 8 ? key : undefined;
}

/** Resolve Birdeye key from common env names (Vercel / local .env.local). */
export function getBirdeyeApiKey(): string | undefined {
  return (
    cleanEnvKey(process.env.BIRDEYE_API_KEY) ??
    cleanEnvKey(process.env.BIRDEYE_KEY) ??
    cleanEnvKey(process.env.BDS_API_KEY)
  );
}

export function hasBirdeyeKey() {
  return Boolean(getBirdeyeApiKey());
}

/** Map DexScreener chain ids → Birdeye x-chain header */
export function birdeyeChainFor(sourceChain: string): string {
  const id = sourceChain.toLowerCase().trim();
  const map: Record<string, string> = {
    solana: "solana",
    ethereum: "ethereum",
    eth: "ethereum",
    base: "base",
    arbitrum: "arbitrum",
    arb: "arbitrum",
    polygon: "polygon",
    matic: "polygon",
    bsc: "bsc",
    optimism: "optimism",
    avalanche: "avalanche",
    avax: "avalanche",
  };
  return map[id] ?? "ethereum";
}

export function isSolanaChain(sourceChain: string): boolean {
  return birdeyeChainFor(sourceChain) === "solana";
}

export function normalizeTokenAddress(address: string, chain: string): string {
  const a = address.trim();
  if (chain === "solana") return a;
  return a.toLowerCase();
}

export type BirdeyeFetchResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
};

async function cachedFetch<T>(cacheKey: string, fetcher: () => Promise<BirdeyeFetchResult<T>>) {
  const hit = responseCache.get(cacheKey) as CacheEntry<BirdeyeFetchResult<T>> | undefined;
  if (hit) {
    const ttl = hit.data.ok ? CACHE_TTL_MS : NEGATIVE_CACHE_MS;
    if (Date.now() - hit.at < ttl) return hit.data;
  }

  const result = await fetcher();
  responseCache.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

export async function birdeyeFetchJson<T>(
  path: string,
  chain: string,
): Promise<BirdeyeFetchResult<T>> {
  const apiKey = getBirdeyeApiKey();
  if (!apiKey) {
    return { ok: false, status: 0, data: null, error: "BIRDEYE_API_KEY not set" };
  }

  const xChain = birdeyeChainFor(chain);
  const cacheKey = `${xChain}:${path}`;

  return cachedFetch(cacheKey, () =>
    scheduleBirdeye(async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch(`https://public-api.birdeye.so${path}`, {
            headers: {
              "X-API-KEY": apiKey,
              "x-chain": xChain,
              accept: "application/json",
            },
            cache: "no-store",
          });

          const json = (await res.json()) as T & { success?: boolean; message?: string };

          if ((res.status === 429 || res.status === 503) && attempt < 3) {
            await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
            continue;
          }

          if (!res.ok || json.success === false) {
            return {
              ok: false,
              status: res.status,
              data: null,
              error: json?.message ?? `HTTP ${res.status}`,
            };
          }

          return { ok: true, status: res.status, data: json };
        } catch (e) {
          if (attempt === 3) {
            return {
              ok: false,
              status: 0,
              data: null,
              error: e instanceof Error ? e.message : "Birdeye fetch failed",
            };
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      return { ok: false, status: 0, data: null, error: "Birdeye unavailable" };
    }),
  );
}
