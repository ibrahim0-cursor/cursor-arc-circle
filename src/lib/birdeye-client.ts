/** Serialize Birdeye requests to avoid 429 rate limits on free tier */
let birdeyeQueue: Promise<unknown> = Promise.resolve();
let lastBirdeyeAt = 0;
const BIRDEYE_GAP_MS = 400;

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

export async function birdeyeFetch(
  path: string,
  chain: string,
  retries = 2,
): Promise<Response | null> {
  const apiKey = process.env.BIRDEYE_API_KEY?.trim();
  if (!apiKey) return null;

  return scheduleBirdeye(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(`https://public-api.birdeye.so${path}`, {
        headers: {
          "X-API-KEY": apiKey,
          "x-chain": chain,
          accept: "application/json",
        },
        cache: "no-store",
      });

      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }

      return res;
    }
    return null;
  });
}

export function hasBirdeyeKey() {
  return Boolean(process.env.BIRDEYE_API_KEY?.trim());
}

/** Map DexScreener chain ids to Birdeye x-chain header values */
export function birdeyeChainHeader(sourceChain: string): string {
  const map: Record<string, string> = {
    solana: "solana",
    ethereum: "ethereum",
    base: "base",
    arbitrum: "arbitrum",
    polygon: "polygon",
    bsc: "bsc",
    optimism: "optimism",
    avalanche: "avalanche",
  };
  return map[sourceChain.toLowerCase()] ?? "ethereum";
}
