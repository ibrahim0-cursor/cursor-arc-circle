/** Birdeye client: rate limit queue, cache, chain mapping */

let birdeyeQueue: Promise<unknown> = Promise.resolve();
let lastBirdeyeAt = 0;
const BIRDEYE_GAP_MS = 3500;
const CACHE_TTL_MS = 600_000;
const NEGATIVE_CACHE_MS = 120_000;

let probeCache: { at: number; result: { ok: boolean; error?: string } } | null = null;
const PROBE_CACHE_MS = 300_000;

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
  rateLimited?: boolean;
};

/** Cached health probe — avoids burning CU on every /api/status poll */
export async function probeBirdeyeHealth(): Promise<{ ok: boolean; error?: string }> {
  if (!hasBirdeyeKey()) return { ok: false, error: "no key" };
  if (probeCache && Date.now() - probeCache.at < PROBE_CACHE_MS) {
    return probeCache.result;
  }
  const probe = await birdeyeFetchJson<{ data?: { symbol?: string } }>(
    "/defi/token_overview?address=0x912ce59144191c1204e64559fe8253a0e49e6548",
    "arbitrum",
  );
  const hasOverview = Boolean(probe.data?.data?.symbol);
  const result =
    probe.ok && hasOverview
      ? { ok: true }
      : {
          ok: false,
          error:
            probe.rateLimited || probe.error?.toLowerCase().includes("compute units")
              ? "Compute units limit — scans use Dex/GMGN until quota resets"
              : probe.error ?? (probe.ok ? "empty response" : `HTTP ${probe.status}`),
        };
  probeCache = { at: Date.now(), result };
  return result;
}

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

          if ((res.status === 429 || res.status === 503) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
            continue;
          }

          if (!res.ok || json.success === false) {
            const errMsg = json?.message ?? `HTTP ${res.status}`;
            return {
              ok: false,
              status: res.status,
              data: null,
              error: errMsg,
              rateLimited: res.status === 429 || /compute units/i.test(errMsg),
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
