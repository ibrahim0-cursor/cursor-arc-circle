/**
 * GMGN Data Analytics skills — OpenAPI on Vercel (no global gmgn-cli).
 * Docs: https://openapi.gmgn.ai · CLI fallback noted per function.
 */

import {
  fetchGmgnMarketRank,
  gmgnApiRequest,
  hasGmgnApiKey,
  type GmgnChain,
  type GmgnTrendingToken,
} from "./gmgn-client";

export type GmgnAnalyticsSkillId =
  | "five-min-trending"
  | "token-overview"
  | "token-security-check"
  | "token-kline"
  | "liquidity-pool"
  | "top-holders"
  | "smart-money-holders"
  | "kol-holders"
  | "newly-created-tokens"
  | "kol-bought-new"
  | "near-graduation"
  | "pump-fun-trending";

export const GMGN_ANALYTICS_SKILL_IDS: GmgnAnalyticsSkillId[] = [
  "five-min-trending",
  "token-overview",
  "token-security-check",
  "token-kline",
  "liquidity-pool",
  "top-holders",
  "smart-money-holders",
  "kol-holders",
  "newly-created-tokens",
  "kol-bought-new",
  "near-graduation",
  "pump-fun-trending",
];

export type GmgnAnalyticsParams = {
  chain?: GmgnChain;
  address?: string;
  interval?: string;
  resolution?: string;
  limit?: number;
  orderBy?: string;
  direction?: "asc" | "desc";
  tag?: string;
  type?: string;
  types?: string[];
  platform?: string;
  platforms?: string[];
  from?: number;
  to?: number;
  minRenownedCount?: number;
  maxMarketcap?: number;
  filterPreset?: string;
  sortBy?: string;
  filters?: Record<string, string | number | boolean | undefined>;
};

export type GmgnAnalyticsResult = {
  ok: boolean;
  skill: GmgnAnalyticsSkillId;
  data?: unknown;
  error?: string;
  status: number;
  /** Equivalent gmgn-cli invocation for local debugging */
  cliFallback?: string;
};

const BASE_INSTALL =
  "npm install -g gmgn-cli && npx skills add GMGNAI/gmgn-skills (requires GMGN_API_KEY)";

export const GMGN_SKILL_CLI: Record<GmgnAnalyticsSkillId, string> = {
  "five-min-trending": "gmgn-cli market trending --chain sol --interval 5m",
  "token-overview": "gmgn-cli token info --chain sol --address <token_address>",
  "token-security-check": "gmgn-cli token security --chain sol --address <token_address>",
  "token-kline":
    "gmgn-cli market kline --chain sol --address <token_address> --resolution 1m",
  "liquidity-pool": "gmgn-cli token pool --chain sol --address <token_address>",
  "top-holders":
    "gmgn-cli token holders --chain sol --address <token_address> --order-by amount_percentage --direction desc",
  "smart-money-holders":
    "gmgn-cli token holders --chain sol --address <token_address> --tag smart_degen --order-by amount_percentage",
  "kol-holders":
    "gmgn-cli token holders --chain sol --address <token_address> --tag renowned --order-by profit",
  "newly-created-tokens": "gmgn-cli market trenches --chain sol --type new_creation",
  "kol-bought-new":
    "gmgn-cli market trenches --chain sol --type new_creation --min-renowned-count 2 --max-marketcap 100000",
  "near-graduation": "gmgn-cli market trenches --chain sol --type near_completion",
  "pump-fun-trending":
    "gmgn-cli market trending --chain sol --interval 1h --platform Pump.fun",
};

function chainParam(chain?: string): GmgnChain {
  const c = (chain ?? "sol").toLowerCase();
  if (c === "sol" || c === "bsc" || c === "base" || c === "eth") return c;
  return "sol";
}

function requireAddress(address?: string): string | null {
  const a = address?.trim();
  return a && a.length > 8 ? a : null;
}

/** Map DexScreener chain ids to GMGN chain slugs. */
export function dexChainIdToGmgn(chainId: string): GmgnChain | null {
  const map: Record<string, GmgnChain> = {
    solana: "sol",
    bsc: "bsc",
    base: "base",
    ethereum: "eth",
  };
  return map[chainId] ?? null;
}

// CLI fallback: gmgn-cli market trending --chain <chain> --interval <interval>
export async function gmgnFiveMinTrending(
  chain: GmgnChain = "sol",
  limit = 50,
): Promise<GmgnAnalyticsResult> {
  const tokens = await fetchGmgnMarketRank(chain, "5m", limit);
  return {
    ok: tokens.length > 0,
    skill: "five-min-trending",
    data: { chain, interval: "5m", count: tokens.length, tokens },
    status: tokens.length > 0 ? 200 : 502,
    cliFallback: GMGN_SKILL_CLI["five-min-trending"].replace("--chain sol", `--chain ${chain}`),
  };
}

// CLI fallback: gmgn-cli token info --chain <chain> --address <address>
export async function gmgnTokenOverview(
  chain: GmgnChain,
  address: string,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<unknown>("GET", "/v1/token/info", { chain, address });
  return wrap("token-overview", res, GMGN_SKILL_CLI["token-overview"], { chain, address });
}

// CLI fallback: gmgn-cli token security --chain <chain> --address <address>
export async function gmgnTokenSecurity(
  chain: GmgnChain,
  address: string,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<unknown>("GET", "/v1/token/security", { chain, address });
  return wrap("token-security-check", res, GMGN_SKILL_CLI["token-security-check"], { chain, address });
}

// CLI fallback: gmgn-cli market kline --chain <chain> --address <addr> --resolution <res>
export async function gmgnTokenKline(
  chain: GmgnChain,
  address: string,
  resolution = "1m",
  from?: number,
  to?: number,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<unknown>("GET", "/v1/market/token_kline", {
    chain,
    address,
    resolution,
    from,
    to,
  });
  return wrap("token-kline", res, GMGN_SKILL_CLI["token-kline"], { chain, address, resolution });
}

// CLI fallback: gmgn-cli token pool --chain <chain> --address <address>
export async function gmgnLiquidityPool(
  chain: GmgnChain,
  address: string,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<unknown>("GET", "/v1/token/pool_info", { chain, address });
  return wrap("liquidity-pool", res, GMGN_SKILL_CLI["liquidity-pool"], { chain, address });
}

type HoldersOpts = {
  limit?: number;
  orderBy?: string;
  direction?: "asc" | "desc";
  tag?: string;
};

async function gmgnTokenHolders(
  chain: GmgnChain,
  address: string,
  skill: "top-holders" | "smart-money-holders" | "kol-holders",
  opts: HoldersOpts,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<unknown>("GET", "/v1/market/token_top_holders", {
    chain,
    address,
    limit: opts.limit ?? 50,
    order_by: opts.orderBy ?? "amount_percentage",
    direction: opts.direction ?? "desc",
    tag: opts.tag,
  });
  return wrap(skill, res, GMGN_SKILL_CLI[skill], { chain, address, ...opts });
}

// CLI fallback: gmgn-cli token holders ... --order-by amount_percentage --direction desc
export function gmgnTopHolders(chain: GmgnChain, address: string, limit = 50) {
  return gmgnTokenHolders(chain, address, "top-holders", {
    limit,
    orderBy: "amount_percentage",
    direction: "desc",
  });
}

// CLI fallback: gmgn-cli token holders ... --tag smart_degen --order-by amount_percentage
export function gmgnSmartMoneyHolders(chain: GmgnChain, address: string, limit = 50) {
  return gmgnTokenHolders(chain, address, "smart-money-holders", {
    limit,
    tag: "smart_degen",
    orderBy: "amount_percentage",
    direction: "desc",
  });
}

// CLI fallback: gmgn-cli token holders ... --tag renowned --order-by profit
export function gmgnKolHolders(chain: GmgnChain, address: string, limit = 20) {
  return gmgnTokenHolders(chain, address, "kol-holders", {
    limit,
    tag: "renowned",
    orderBy: "profit",
    direction: "desc",
  });
}

type TrenchesOpts = {
  types: string[];
  limit?: number;
  platforms?: string[];
  filterPreset?: string;
  sortBy?: string;
  filters?: Record<string, string | number | boolean | undefined>;
};

// CLI fallback: gmgn-cli market trenches --chain <chain> --type <types...>
async function gmgnTrenches(
  chain: GmgnChain,
  skill: "newly-created-tokens" | "kol-bought-new" | "near-graduation",
  opts: TrenchesOpts,
): Promise<GmgnAnalyticsResult> {
  const body: Record<string, unknown> = {
    chain,
    types: opts.types,
    limit: opts.limit ?? 80,
  };
  if (opts.platforms?.length) body.platforms = opts.platforms;
  if (opts.filterPreset) body.filter_preset = opts.filterPreset;
  if (opts.sortBy) body.sort_by = opts.sortBy;
  if (opts.filters && Object.keys(opts.filters).length > 0) body.filters = opts.filters;

  const res = await gmgnApiRequest<unknown>("POST", "/v1/trenches", { chain }, body);
  return wrap(skill, res, GMGN_SKILL_CLI[skill], { chain, ...opts });
}

export function gmgnNewlyCreated(chain: GmgnChain = "sol", limit = 80) {
  return gmgnTrenches(chain, "newly-created-tokens", { types: ["new_creation"], limit });
}

export function gmgnKolBoughtNew(chain: GmgnChain = "sol", limit = 80) {
  return gmgnTrenches(chain, "kol-bought-new", {
    types: ["new_creation"],
    limit,
    filters: { min_renowned_count: 2, max_marketcap: 100_000 },
  });
}

export function gmgnNearGraduation(chain: GmgnChain = "sol", limit = 80) {
  return gmgnTrenches(chain, "near-graduation", { types: ["near_completion"], limit });
}

// CLI fallback: gmgn-cli market trending --chain sol --interval 1h --platform Pump.fun
export async function gmgnPumpFunTrending(
  chain: GmgnChain = "sol",
  interval = "1h",
  limit = 50,
): Promise<GmgnAnalyticsResult> {
  const res = await gmgnApiRequest<{ rank?: unknown[] }>("GET", "/v1/market/rank", {
    chain,
    interval,
    limit,
    platform: "Pump.fun",
  });
  if (!res.ok) {
    return wrap("pump-fun-trending", res, GMGN_SKILL_CLI["pump-fun-trending"], { chain, interval });
  }
  const rank = (res.data as { rank?: unknown[] })?.rank ?? res.data;
  const rows = Array.isArray(rank) ? rank : [];
  return {
    ok: true,
    skill: "pump-fun-trending",
    data: { chain, interval, platform: "Pump.fun", count: rows.length, rank: rows },
    status: 200,
    cliFallback: GMGN_SKILL_CLI["pump-fun-trending"],
  };
}

function wrap(
  skill: GmgnAnalyticsSkillId,
  res: { ok: boolean; data?: unknown; error?: string; status: number },
  cli: string,
  ctx: Record<string, unknown>,
): GmgnAnalyticsResult {
  return {
    ok: res.ok,
    skill,
    data: res.ok ? res.data : undefined,
    error: res.error,
    status: res.status || (res.ok ? 200 : 502),
    cliFallback: cli,
    ...(res.ok ? {} : { data: { context: ctx } }),
  };
}

export function isGmgnAnalyticsSkill(id: string): id is GmgnAnalyticsSkillId {
  return (GMGN_ANALYTICS_SKILL_IDS as string[]).includes(id);
}

export async function runGmgnAnalyticsSkill(
  skill: GmgnAnalyticsSkillId,
  params: GmgnAnalyticsParams = {},
): Promise<GmgnAnalyticsResult> {
  if (!hasGmgnApiKey()) {
    return {
      ok: false,
      skill,
      error: "GMGN_API_KEY not configured",
      status: 503,
      cliFallback: GMGN_SKILL_CLI[skill],
    };
  }

  const chain = chainParam(params.chain);
  const limit = params.limit;

  switch (skill) {
    case "five-min-trending":
      return gmgnFiveMinTrending(chain, limit ?? 50);
    case "pump-fun-trending":
      return gmgnPumpFunTrending(chain, params.interval ?? "1h", limit ?? 50);
    case "newly-created-tokens":
      return gmgnNewlyCreated(chain, limit ?? 80);
    case "kol-bought-new":
      return gmgnKolBoughtNew(chain, limit ?? 80);
    case "near-graduation":
      return gmgnNearGraduation(chain, limit ?? 80);
    case "token-overview": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnTokenOverview(chain, addr);
    }
    case "token-security-check": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnTokenSecurity(chain, addr);
    }
    case "token-kline": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnTokenKline(chain, addr, params.resolution ?? "1m", params.from, params.to);
    }
    case "liquidity-pool": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnLiquidityPool(chain, addr);
    }
    case "top-holders": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnTopHolders(chain, addr, limit ?? 50);
    }
    case "smart-money-holders": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnSmartMoneyHolders(chain, addr, limit ?? 50);
    }
    case "kol-holders": {
      const addr = requireAddress(params.address);
      if (!addr) return missingAddress(skill);
      return gmgnKolHolders(chain, addr, limit ?? 20);
    }
    default:
      return { ok: false, skill, error: "Unknown skill", status: 400, cliFallback: GMGN_SKILL_CLI[skill] };
  }
}

function missingAddress(skill: GmgnAnalyticsSkillId): GmgnAnalyticsResult {
  return {
    ok: false,
    skill,
    error: "address query param required for this skill",
    status: 400,
    cliFallback: GMGN_SKILL_CLI[skill],
  };
}

/** Bundle for per-token NEXUS / deep analysis (security + smart money holders). */
export async function fetchGmgnTokenScanBundle(
  chain: GmgnChain,
  address: string,
): Promise<{
  security: GmgnAnalyticsResult | null;
  smartMoneyHolders: GmgnAnalyticsResult | null;
  trendingMatch: GmgnTrendingToken | null;
}> {
  if (!hasGmgnApiKey()) {
    return { security: null, smartMoneyHolders: null, trendingMatch: null };
  }

  const security = await gmgnTokenSecurity(chain, address);
  const smartMoneyHolders = await gmgnSmartMoneyHolders(chain, address, 20);
  const trending = await fetchGmgnMarketRank(chain, "1h", 20).catch(() => [] as GmgnTrendingToken[]);

  const key = address.toLowerCase();
  const trendingMatch = trending.find((t) => t.address.toLowerCase() === key) ?? null;

  return { security, smartMoneyHolders, trendingMatch };
}

export { BASE_INSTALL as GMGN_ANALYTICS_BASE_INSTALL };
