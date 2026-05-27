/**
 * GMGN Monitor skills — signals + live tracks (OpenAPI on Vercel).
 * CLI: gmgn-cli market signal · gmgn-cli track smartmoney|kol
 */

import { gmgnApiRequest, hasGmgnApiKey, type GmgnChain } from "./gmgn-client";

export type GmgnMonitorSkillId =
  | "smart-money-buy-signal"
  | "price-surge-signal"
  | "kol-call-signal"
  | "smart-money-trades"
  | "kol-trade-activity"
  | "smart-money-exit-signal";

export const GMGN_MONITOR_SKILL_IDS: GmgnMonitorSkillId[] = [
  "smart-money-buy-signal",
  "price-surge-signal",
  "kol-call-signal",
  "smart-money-trades",
  "kol-trade-activity",
  "smart-money-exit-signal",
];

export type GmgnMonitorParams = {
  chain?: GmgnChain;
  limit?: number;
  side?: "buy" | "sell";
  signalTypes?: number[];
};

export type GmgnMonitorResult = {
  ok: boolean;
  skill: GmgnMonitorSkillId;
  data?: unknown;
  error?: string;
  status: number;
  cliFallback?: string;
};

export const GMGN_MONITOR_BASE_INSTALL =
  "npm install -g gmgn-cli && npx skills add GMGNAI/gmgn-skills (requires GMGN_API_KEY)";

export const GMGN_MONITOR_CLI: Record<GmgnMonitorSkillId, string> = {
  "smart-money-buy-signal": "gmgn-cli market signal --chain sol --signal-type 12",
  "price-surge-signal": "gmgn-cli market signal --chain sol --signal-type 6",
  "kol-call-signal": "gmgn-cli market signal --chain sol --signal-type 13",
  "smart-money-trades": "gmgn-cli track smartmoney --chain sol",
  "kol-trade-activity": "gmgn-cli track kol --chain sol",
  "smart-money-exit-signal": "gmgn-cli track smartmoney --chain sol --side sell",
};

const SIGNAL_TYPES: Record<
  "smart-money-buy-signal" | "price-surge-signal" | "kol-call-signal",
  number[]
> = {
  "smart-money-buy-signal": [12],
  "price-surge-signal": [6],
  "kol-call-signal": [13],
};

function chainParam(chain?: string): GmgnChain {
  const c = (chain ?? "sol").toLowerCase();
  if (c === "sol" || c === "bsc") return c;
  return "sol";
}

function signalChain(chain: GmgnChain): GmgnChain {
  return chain === "bsc" ? "bsc" : "sol";
}

function wrap(
  skill: GmgnMonitorSkillId,
  res: { ok: boolean; data?: unknown; error?: string; status: number },
  cli: string,
): GmgnMonitorResult {
  return {
    ok: res.ok,
    skill,
    data: res.ok ? res.data : undefined,
    error: res.error,
    status: res.status || (res.ok ? 200 : 502),
    cliFallback: cli,
  };
}

type TradeRow = {
  side?: string;
  base_address?: string;
  base_token?: { symbol?: string; name?: string };
  amount_usd?: number;
  price_usd?: number;
  timestamp?: number;
  maker?: string;
};

function tradeList(data: unknown): TradeRow[] {
  if (!data || typeof data !== "object") return [];
  const list = (data as { list?: unknown[] }).list;
  return Array.isArray(list) ? (list as TradeRow[]) : [];
}

function filterTrades(rows: TradeRow[], side?: "buy" | "sell"): TradeRow[] {
  if (!side) return rows;
  return rows.filter((r) => String(r.side ?? "").toLowerCase() === side);
}

// CLI: gmgn-cli market signal --chain <chain> --signal-type <n>
async function gmgnMarketSignal(
  chain: GmgnChain,
  skill: "smart-money-buy-signal" | "price-surge-signal" | "kol-call-signal",
  signalTypes: number[],
): Promise<GmgnMonitorResult> {
  const c = signalChain(chain);
  const body = {
    chain: c,
    groups: [{ signal_type: signalTypes }],
  };
  const res = await gmgnApiRequest<unknown>("POST", "/v1/market/token_signal", { chain: c }, body);
  const cli = GMGN_MONITOR_CLI[skill].replace("--chain sol", `--chain ${c}`);
  return wrap(skill, res, cli);
}

// CLI: gmgn-cli track smartmoney|kol --chain <chain>
async function gmgnTrack(
  chain: GmgnChain,
  skill: "smart-money-trades" | "kol-trade-activity" | "smart-money-exit-signal",
  path: "/v1/user/smartmoney" | "/v1/user/kol",
  opts: { limit?: number; side?: "buy" | "sell" },
): Promise<GmgnMonitorResult> {
  const res = await gmgnApiRequest<unknown>("GET", path, {
    chain,
    limit: opts.limit ?? 50,
  });
  if (!res.ok) {
    return wrap(skill, res, GMGN_MONITOR_CLI[skill]);
  }
  const rows = filterTrades(tradeList(res.data), opts.side);
  return {
    ok: true,
    skill,
    data: { chain, count: rows.length, list: rows, sideFilter: opts.side ?? null },
    status: 200,
    cliFallback: GMGN_MONITOR_CLI[skill].replace("--chain sol", `--chain ${chain}`),
  };
}

export function isGmgnMonitorSkill(id: string): id is GmgnMonitorSkillId {
  return (GMGN_MONITOR_SKILL_IDS as string[]).includes(id);
}

export async function runGmgnMonitorSkill(
  skill: GmgnMonitorSkillId,
  params: GmgnMonitorParams = {},
): Promise<GmgnMonitorResult> {
  if (!hasGmgnApiKey()) {
    return {
      ok: false,
      skill,
      error: "GMGN_API_KEY not configured",
      status: 503,
      cliFallback: GMGN_MONITOR_CLI[skill],
    };
  }

  const chain = chainParam(params.chain);

  switch (skill) {
    case "smart-money-buy-signal":
      return gmgnMarketSignal(chain, skill, params.signalTypes ?? SIGNAL_TYPES[skill]);
    case "price-surge-signal":
      return gmgnMarketSignal(chain, skill, params.signalTypes ?? SIGNAL_TYPES[skill]);
    case "kol-call-signal":
      return gmgnMarketSignal(chain, skill, params.signalTypes ?? SIGNAL_TYPES[skill]);
    case "smart-money-trades":
      return gmgnTrack(chain, skill, "/v1/user/smartmoney", {
        limit: params.limit,
        side: params.side,
      });
    case "kol-trade-activity":
      return gmgnTrack(chain, skill, "/v1/user/kol", { limit: params.limit, side: params.side });
    case "smart-money-exit-signal":
      return gmgnTrack(chain, skill, "/v1/user/smartmoney", {
        limit: params.limit,
        side: params.side ?? "sell",
      });
    default:
      return { ok: false, skill, error: "Unknown skill", status: 400 };
  }
}

export type GmgnSignalEvent = {
  tokenAddress: string;
  symbol?: string;
  signalType: number;
  triggerAt?: number;
  marketCap?: number;
};

export function parseSignalEvents(data: unknown): GmgnSignalEvent[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.list)) rows = d.list;
    else if (Array.isArray(d.signals)) rows = d.signals;
    else if (Array.isArray(d.data)) rows = d.data;
  }
  const out: GmgnSignalEvent[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const tokenAddress = String(r.token_address ?? "").trim();
    if (!tokenAddress) continue;
    const cur = r.cur_data as Record<string, unknown> | undefined;
    const snap = r.data as Record<string, unknown> | undefined;
    out.push({
      tokenAddress,
      symbol: String(
        (snap?.symbol as string) ?? (cur as { symbol?: string })?.symbol ?? "",
      ).trim() || undefined,
      signalType: Number(r.signal_type ?? 0),
      triggerAt: Number(r.trigger_at ?? 0) || undefined,
      marketCap: Number(r.market_cap ?? r.trigger_mc ?? 0) || undefined,
    });
  }
  return out;
}

export async function probeGmgnMonitorSkills(chain: GmgnChain = "sol"): Promise<{
  ok: boolean;
  skills: Record<string, { ok: boolean; error?: string }>;
}> {
  if (!hasGmgnApiKey()) return { ok: false, skills: {} };

  const probes: GmgnMonitorSkillId[] = [
    "smart-money-buy-signal",
    "price-surge-signal",
    "smart-money-trades",
  ];

  const skills: Record<string, { ok: boolean; error?: string }> = {};
  await Promise.all(
    probes.map(async (id) => {
      const r = await runGmgnMonitorSkill(id, { chain, limit: 5 });
      skills[id] = { ok: r.ok, error: r.error };
    }),
  );

  const okCount = Object.values(skills).filter((s) => s.ok).length;
  return { ok: okCount >= 1, skills };
}
