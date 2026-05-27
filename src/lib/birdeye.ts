import type { TokenTx, TokenWhale, TokenInsider } from "./storage";
import { scoreTokenWallet, type WalletScore } from "./wallet-score";
import type { TokenIntel } from "./storage";
import {
  birdeyeChainFor,
  birdeyeFetchJson,
  hasBirdeyeKey,
  isSolanaChain,
  normalizeTokenAddress,
} from "./birdeye-client";

export type BirdeyeTokenOverview = {
  symbol: string;
  address: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  mc: number;
  fdv?: number;
  holder?: number;
  uniqueWallet24h?: number;
  trade24h?: number;
  buy24h?: number;
  sell24h?: number;
};

export type BirdeyeSecurity = {
  sniperCount?: number;
  top10HolderPercent?: number;
  isMintable?: boolean;
  isFreezable?: boolean;
  holderCount?: number;
  sniperWallets?: string[];
};

export { hasBirdeyeKey, birdeyeChainFor };

type DetectionPayload = {
  chain: string;
  trades: TokenTx[];
  whales: TokenWhale[];
  snipers: Array<{ address: string; label: string; detected: boolean }>;
  insiders: TokenInsider[];
  holders: Array<TokenWhale & { rank?: number }>;
  walletScores: WalletScore[];
  summary: Record<string, unknown>;
  errors?: string[];
};

const detectionCache = new Map<string, { at: number; data: DetectionPayload }>();
const DETECTION_CACHE_MS = 300_000;

export async function fetchBirdeyeOverview(
  address: string,
  sourceChain: string,
): Promise<BirdeyeTokenOverview | null> {
  if (!hasBirdeyeKey()) return null;

  const chain = birdeyeChainFor(sourceChain);
  const addr = normalizeTokenAddress(address, chain);

  const res = await birdeyeFetchJson<{
    data?: {
      symbol?: string;
      address?: string;
      price?: number;
      priceChange24hPercent?: number;
      v24hUSD?: number;
      liquidity?: number;
      mc?: number;
      fdv?: number;
      holder?: number;
      uniqueWallet24h?: number;
      trade24h?: number;
      buy24h?: number;
      sell24h?: number;
    };
  }>(`/defi/token_overview?address=${addr}`, chain);

  if (!res.ok || !res.data?.data) return null;
  const data = res.data.data;
  const price = data.price ?? 0;
  if (!price && !data.holder && !data.mc && !data.v24hUSD) return null;

  return {
    symbol: data.symbol ?? "UNKNOWN",
    address: data.address ?? addr,
    price: price || 0,
    priceChange24h: data.priceChange24hPercent ?? 0,
    volume24h: data.v24hUSD ?? 0,
    liquidity: data.liquidity ?? 0,
    mc: data.mc ?? 0,
    fdv: data.fdv,
    holder: data.holder,
    uniqueWallet24h: data.uniqueWallet24h,
    trade24h: data.trade24h,
    buy24h: data.buy24h,
    sell24h: data.sell24h,
  };
}

export async function fetchBirdeyeSecurity(
  address: string,
  sourceChain: string,
): Promise<BirdeyeSecurity | null> {
  if (!hasBirdeyeKey()) return null;

  const chain = birdeyeChainFor(sourceChain);
  const addr = normalizeTokenAddress(address, chain);

  const res = await birdeyeFetchJson<{
    data?: {
      sniperCount?: number;
      top10HolderPercent?: number;
      isMintable?: boolean;
      isFreezable?: boolean;
      holderCount?: number;
      ownerPercentage?: number;
      sniperWallets?: string[];
      snipers?: Array<{ address?: string }>;
    };
  }>(`/defi/token_security?address=${addr}`, chain);

  if (!res.ok || !res.data?.data) return null;
  const data = res.data.data;

  const sniperWallets =
    data.sniperWallets ??
    (data.snipers?.map((s) => s.address).filter(Boolean) as string[] | undefined);

  return {
    sniperCount: data.sniperCount ?? sniperWallets?.length,
    top10HolderPercent: data.top10HolderPercent ?? data.ownerPercentage,
    isMintable: data.isMintable,
    isFreezable: data.isFreezable,
    holderCount: data.holderCount,
    sniperWallets,
  };
}

function parseTradeItem(item: Record<string, unknown>, tokenAddress?: string): TokenTx | null {
  const hash = (item.tx_hash ??
    item.txHash ??
    item.signature ??
    item.hash) as string | undefined;
  const blockUnixTime = (item.block_unix_time ?? item.blockUnixTime) as number | undefined;
  const signers = item.signers as string[] | undefined;
  const owner = (item.owner ??
    item.trader ??
    item.signer ??
    signers?.[0] ??
    (item as { user?: string }).user) as string | undefined;

  let side: TokenTx["side"] = "unknown";
  let amountUsd = 0;

  const sideRaw = String(item.side ?? item.tx_type ?? item.txType ?? "").toLowerCase();
  if (sideRaw.includes("buy")) side = "buy";
  else if (sideRaw.includes("sell")) side = "sell";

  if (typeof item.volume_usd === "number") amountUsd = item.volume_usd;
  else if (typeof item.volumeUSD === "number") amountUsd = item.volumeUSD;
  else if (typeof item.volumeUsd === "number") amountUsd = item.volumeUsd;
  else if (typeof item.tokenPrice === "number") amountUsd = item.tokenPrice;

  const pricePair = item.pricePair as number | undefined;
  if (!amountUsd && typeof pricePair === "number") amountUsd = Math.abs(pricePair);

  const from = item.from as { uiAmount?: number; ui_amount?: number } | undefined;
  const to = item.to as { uiAmount?: number; ui_amount?: number } | undefined;
  if (!amountUsd && from?.uiAmount) amountUsd = Math.abs(from.uiAmount);
  if (!amountUsd && from?.ui_amount) amountUsd = Math.abs(from.ui_amount);
  if (!amountUsd && to?.uiAmount) amountUsd = Math.abs(to.uiAmount);
  if (!amountUsd && to?.ui_amount) amountUsd = Math.abs(to.ui_amount);

  if (side === "unknown" && tokenAddress) {
    const tokens = item.tokens as Array<{ address?: string; ui_amount?: number }> | undefined;
    const target = normalizeTokenAddress(tokenAddress, "ethereum");
    const base = tokens?.find((t) => t.address?.toLowerCase() === target);
    if (base && (base.ui_amount ?? 0) > 0) side = "buy";
    else if (base && (base.ui_amount ?? 0) < 0) side = "sell";
  }

  if (!owner) return null;

  return {
    hash,
    type: "swap",
    side,
    amountUsd,
    trader: owner,
    timestamp: blockUnixTime
      ? new Date(blockUnixTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

function parseTradesResponse(
  items: Array<Record<string, unknown>> | undefined,
  addr: string,
): TokenTx[] {
  if (!items?.length) return [];
  return items.map((item) => parseTradeItem(item, addr)).filter((t): t is TokenTx => t !== null);
}

export async function fetchBirdeyeTrades(
  address: string,
  sourceChain: string,
  limit = 12,
): Promise<TokenTx[]> {
  if (!hasBirdeyeKey()) return [];

  const chain = birdeyeChainFor(sourceChain);
  const addr = normalizeTokenAddress(address, chain);

  const legacy = await birdeyeFetchJson<{
    data?: { items?: Array<Record<string, unknown>> };
  }>(`/defi/txs/token?address=${addr}&tx_type=swap&limit=${limit}`, chain);

  const legacyTrades = parseTradesResponse(legacy.data?.data?.items, addr);
  if (legacyTrades.length) return legacyTrades;

  const v3 = await birdeyeFetchJson<{
    data?: { items?: Array<Record<string, unknown>> };
  }>(
    `/defi/v3/token/txs?address=${addr}&limit=${limit}&sort_by=block_unix_time&sort_type=desc&tx_type=swap`,
    chain,
  );

  return parseTradesResponse(v3.data?.data?.items, addr);
}

async function fetchBirdeyeHolders(
  address: string,
  chain: string,
  limit: number,
): Promise<TokenWhale[]> {
  const addr = normalizeTokenAddress(address, chain);

  const res = await birdeyeFetchJson<{
    data?: {
      items?: Array<{
        owner?: string;
        address?: string;
        uiAmount?: number;
        ui_amount?: number;
        amount?: number;
        percentage?: number;
        percent?: number;
      }>;
    };
  }>(`/defi/v3/token/holder?address=${addr}&offset=0&limit=${limit}`, chain);

  if (!res.ok || !res.data?.data?.items?.length) return [];

  const items = res.data.data.items;
  const totalBalance = items.reduce(
    (sum, h) => sum + (h.uiAmount ?? h.ui_amount ?? h.amount ?? 0),
    0,
  );

  return items
    .map((h, i) => {
      const balance = h.uiAmount ?? h.ui_amount ?? h.amount ?? 0;
      const pct =
        h.percentage ??
        h.percent ??
        (totalBalance > 0 ? (balance / totalBalance) * 100 : 0);
      return {
        address: h.owner ?? h.address ?? "",
        balance,
        pct,
        label: i === 0 ? "Top holder" : i < 3 ? "Major holder" : "Whale",
      };
    })
    .filter((w) => w.address.length > 4);
}

async function fetchBirdeyeTopTraders(
  address: string,
  chain: string,
  limit: number,
): Promise<TokenWhale[]> {
  const addr = normalizeTokenAddress(address, chain);
  const sortBy = chain === "solana" ? "volume_usd" : "volume";

  const res = await birdeyeFetchJson<{
    data?: {
      items?: Array<{
        owner?: string;
        volumeUsd?: number;
        volume_usd?: number;
        volume?: number;
        tradeBuy?: number;
        tradeSell?: number;
        tags?: string[];
      }>;
    };
  }>(
    `/defi/v2/tokens/top_traders?address=${addr}&time_frame=24h&sort_by=${sortBy}&sort_type=desc&offset=0&limit=${limit}`,
    chain,
  );

  if (!res.ok || !res.data?.data?.items?.length) return [];

  const items = res.data.data.items;
  const totalVol = items.reduce(
    (sum, t) => sum + (t.volumeUsd ?? t.volume_usd ?? t.volume ?? 0),
    0,
  );

  return items
    .map((t, i) => {
      const vol = t.volumeUsd ?? t.volume_usd ?? t.volume ?? 0;
      const tag = t.tags?.[0];
      return {
        address: t.owner ?? "",
        balance: vol,
        pct: totalVol > 0 ? (vol / totalVol) * 100 : 0,
        label: tag
          ? String(tag)
          : i === 0
            ? "Top trader"
            : i < 3
              ? "Major trader"
              : "Whale trader",
      };
    })
    .filter((w) => w.address.length > 4);
}

export async function fetchBirdeyeWhales(
  address: string,
  sourceChain: string,
  limit = 12,
): Promise<TokenWhale[]> {
  if (!hasBirdeyeKey()) return [];

  const chain = birdeyeChainFor(sourceChain);
  if (isSolanaChain(sourceChain)) {
    const holders = await fetchBirdeyeHolders(address, chain, limit);
    if (holders.length) return holders;
  }

  return fetchBirdeyeTopTraders(address, chain, limit);
}

export function mergeBirdeyeIntel(
  local: TokenIntel,
  birdeye: Partial<Awaited<ReturnType<typeof fetchTokenIntel>>["intel"]>,
): TokenIntel {
  return {
    ...local,
    marketCap: birdeye.marketCap ?? local.marketCap,
    fdv: birdeye.fdv ?? local.fdv,
    holderCount: birdeye.holderCount ?? local.holderCount,
    uniqueWallet24h: birdeye.uniqueWallet24h ?? local.uniqueWallet24h,
    sniperCount: birdeye.sniperCount ?? local.sniperCount,
    top10HolderPercent: birdeye.top10HolderPercent ?? local.top10HolderPercent,
    buy24h: birdeye.buy24h ?? local.buy24h,
    sell24h: birdeye.sell24h ?? local.sell24h,
    trade24h: birdeye.trade24h ?? local.trade24h,
    isMintable: birdeye.isMintable ?? local.isMintable,
    isFreezable: birdeye.isFreezable ?? local.isFreezable,
    sniperWallets: birdeye.sniperWallets ?? local.sniperWallets,
    technical: local.technical,
  };
}

export async function fetchTokenIntel(address: string, sourceChain: string) {
  const overview = await fetchBirdeyeOverview(address, sourceChain);
  const security = await fetchBirdeyeSecurity(address, sourceChain);

  return {
    overview,
    security,
    intel: {
      marketCap: overview?.mc,
      fdv: overview?.fdv,
      holderCount: security?.holderCount ?? overview?.holder,
      uniqueWallet24h: overview?.uniqueWallet24h,
      sniperCount: security?.sniperCount,
      top10HolderPercent: security?.top10HolderPercent,
      buy24h: overview?.buy24h,
      sell24h: overview?.sell24h,
      trade24h: overview?.trade24h,
      isMintable: security?.isMintable,
      isFreezable: security?.isFreezable,
      sniperWallets: security?.sniperWallets,
    },
  };
}

export async function fetchTokenDetection(
  address: string,
  sourceChain: string,
  opts?: { mode?: "full" | "lite" | "off" },
) {
  const chain = birdeyeChainFor(sourceChain);
  const addr = normalizeTokenAddress(address, chain);
  const mode = opts?.mode ?? "full";
  const cacheKey = `${chain}:${addr}:${mode}`;

  const hit = detectionCache.get(cacheKey);
  if (hit && Date.now() - hit.at < DETECTION_CACHE_MS) return hit.data;

  if (!hasBirdeyeKey() || mode === "off") {
    return emptyDetection(chain, mode === "off" ? [] : ["BIRDEYE_API_KEY missing on server"]);
  }

  const errors: string[] = [];

  const whales = await fetchBirdeyeWhales(address, sourceChain, mode === "lite" ? 8 : 12);
  if (!whales.length) errors.push("whales/traders empty or rate-limited");

  let trades: TokenTx[] = [];
  let overview: BirdeyeTokenOverview | null = null;
  if (mode === "full") {
    trades = await fetchBirdeyeTrades(address, sourceChain);
    if (!trades.length) errors.push("trades empty or rate-limited");
    overview = await fetchBirdeyeOverview(address, sourceChain);
    if (!overview) errors.push("overview skipped (rate limit OK if traders+txs loaded)");
  }

  let security: BirdeyeSecurity | null = null;
  if (isSolanaChain(sourceChain) && (mode === "full" || whales.length > 0)) {
    security = await fetchBirdeyeSecurity(address, sourceChain);
    if (!security && mode === "full") errors.push("token_security unavailable");
  }

  const snipers = (security?.sniperWallets ?? []).map((wallet, i) => ({
    address: wallet,
    label: `Sniper #${i + 1}`,
    detected: true,
  }));

  const insiderList = buildInsiders(whales, snipers, security?.top10HolderPercent);
  const birdeyeLive = whales.length > 0 || trades.length > 0 || Boolean(overview) || snipers.length > 0;
  const holderSource = isSolanaChain(sourceChain) ? "holders" : "top_traders";

  const result = {
    chain,
    trades: trades.slice(0, 15),
    whales,
    snipers,
    insiders: insiderList,
    holders: whales.slice(0, 12).map((w, i) => ({ ...w, rank: i + 1 })),
    walletScores: buildWalletScores(whales, snipers, security),
    summary: {
      sniperCount: security?.sniperCount ?? (snipers.length || undefined),
      whaleCount: whales.length || undefined,
      insiderCount: insiderList.length || undefined,
      top10Pct: security?.top10HolderPercent,
      buy24h: overview?.buy24h,
      sell24h: overview?.sell24h,
      holderCount: security?.holderCount ?? overview?.holder,
      birdeyeConnected: true,
      birdeyeLive,
      holderSource,
      dataSource: birdeyeLive ? ("birdeye" as const) : ("birdeye_pending" as const),
      symbol: overview?.symbol,
      priceUsd: overview?.price,
    },
    errors: errors.length && !birdeyeLive ? errors : undefined,
  };

  detectionCache.set(cacheKey, { at: Date.now(), data: result });
  return result;
}

function emptyDetection(chain: string, errors: string[]) {
  return {
    chain,
    trades: [] as TokenTx[],
    whales: [] as TokenWhale[],
    snipers: [] as Array<{ address: string; label: string; detected: boolean }>,
    insiders: [] as TokenInsider[],
    holders: [] as Array<TokenWhale & { rank?: number }>,
    walletScores: [],
    summary: {
      birdeyeConnected: hasBirdeyeKey(),
      birdeyeLive: false,
      dataSource: "unavailable" as const,
    },
    errors,
  };
}

function buildInsiders(
  whales: TokenWhale[],
  snipers: Array<{ address: string }>,
  top10Pct?: number,
): TokenInsider[] {
  const sniperSet = new Set(snipers.map((s) => s.address.toLowerCase()));
  return whales
    .filter((w) => w.pct >= 3 || sniperSet.has(w.address.toLowerCase()))
    .slice(0, 8)
    .map((w) => ({
      address: w.address,
      pct: w.pct,
      label: w.pct > 15 ? "Probable insider / deployer" : "Early allocator",
      risk:
        w.pct > 15 || (top10Pct !== undefined && top10Pct > 50)
          ? "high"
          : w.pct > 8
            ? "medium"
            : "low",
    }));
}

function buildWalletScores(
  whales: TokenWhale[],
  snipers: Array<{ address: string }>,
  security: BirdeyeSecurity | null,
) {
  const sniperSet = new Set(snipers.map((s) => s.address.toLowerCase()));
  return whales.slice(0, 8).map((w) =>
    scoreTokenWallet({
      address: w.address,
      whale: w,
      isSniper: sniperSet.has(w.address.toLowerCase()),
      isInsider: w.pct > 10,
      intel: { sniperCount: security?.sniperCount, top10HolderPercent: security?.top10HolderPercent },
    }),
  );
}
