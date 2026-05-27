/**
 * GMGN OpenAPI client (read + optional signed trade routes).
 * https://openapi.gmgn.ai · docs: https://docs.gmgn.ai/index/gmgn-agent-api
 */

import { createPrivateKey, sign } from "crypto";
import { randomUUID } from "crypto";

const DEFAULT_HOST = "https://openapi.gmgn.ai";

export type GmgnChain = "sol" | "bsc" | "base" | "eth";

export type GmgnTrendingToken = {
  address: string;
  symbol: string;
  name: string;
  chain: GmgnChain;
  priceUsd: number;
  change24h: number;
  volume24h: number;
  liquidityUsd: number;
  marketCap: number;
  logo?: string;
};

function cleanEnv(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().replace(/^['"]|['"]$/g, "");
  return v.length > 0 ? v : undefined;
}

export function hasGmgnApiKey(): boolean {
  return Boolean(cleanEnv(process.env.GMGN_API_KEY) ?? cleanEnv(process.env.GMGN_API_KEY_ID));
}

export function hasGmgnPrivateKey(): boolean {
  return Boolean(cleanEnv(process.env.GMGN_PRIVATE_KEY));
}

function apiKey(): string | null {
  return cleanEnv(process.env.GMGN_API_KEY) ?? cleanEnv(process.env.GMGN_API_KEY_ID) ?? null;
}

function host(): string {
  return cleanEnv(process.env.GMGN_HOST) ?? DEFAULT_HOST;
}

function authQuery(): { timestamp: string; client_id: string } {
  return {
    timestamp: String(Math.floor(Date.now() / 1000)),
    client_id: randomUUID(),
  };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  const auth = authQuery();
  q.set("timestamp", auth.timestamp);
  q.set("client_id", auth.client_id);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v));
  }
  return q.toString();
}

function privateKeyPem(): string | undefined {
  const raw = cleanEnv(process.env.GMGN_PRIVATE_KEY);
  if (!raw) return undefined;
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function signCritical(
  subPath: string,
  queryString: string,
  body: string,
  timestamp: string,
): string | null {
  const pem = privateKeyPem();
  if (!pem) return null;
  try {
    const key = createPrivateKey(pem);
    const message = `${subPath}:${queryString}:${body}:${timestamp}`;
    const sig = sign(null, Buffer.from(message, "utf8"), key);
    return sig.toString("base64");
  } catch {
    return null;
  }
}

/** Low-level OpenAPI request (read routes use API key only; trade routes need GMGN_PRIVATE_KEY). */
export async function gmgnApiRequest<T>(
  method: "GET" | "POST",
  path: string,
  params: Record<string, string | number | undefined> = {},
  body?: Record<string, unknown>,
  critical = false,
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const key = apiKey();
  if (!key) return { ok: false, error: "GMGN_API_KEY not set", status: 0 };

  const qs = buildQuery(params);
  const url = `${host()}${path}?${qs}`;
  const subPath = path;
  const bodyStr = body ? JSON.stringify(body) : "";
  const headers: Record<string, string> = {
    "X-APIKEY": key,
    Accept: "application/json",
  };

  if (critical) {
    const auth = Object.fromEntries(new URLSearchParams(qs));
    const sig = signCritical(subPath, qs, bodyStr, auth.timestamp ?? "");
    if (!sig) return { ok: false, error: "GMGN_PRIVATE_KEY missing or invalid", status: 0 };
    headers["X-Signature"] = sig;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(bodyStr ? { "Content-Type": "application/json" } : {}),
      },
      body: bodyStr || undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, error: text.slice(0, 200) || `HTTP ${res.status}`, status: res.status };
    }
    const json = JSON.parse(text) as { code?: number; data?: unknown; msg?: string };
    if (json.code !== 0 && json.code !== undefined) {
      return { ok: false, error: json.msg ?? `GMGN code ${json.code}`, status: res.status };
    }
    let payload: unknown = json.data ?? json;
    for (let i = 0; i < 3; i++) {
      if (payload && typeof payload === "object" && "data" in payload) {
        payload = (payload as { data: unknown }).data;
      } else break;
    }
    return { ok: true, data: payload as T, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "GMGN request failed",
      status: 0,
    };
  }
}

type RankRow = {
  address?: string;
  symbol?: string;
  name?: string;
  chain?: string;
  price?: number;
  price_change_percent1h?: number;
  price_change_percent?: number;
  volume?: number;
  liquidity?: number;
  market_cap?: number;
  logo?: string;
};

export async function fetchGmgnMarketRank(
  chain: GmgnChain,
  interval = "1h",
  limit = 20,
): Promise<GmgnTrendingToken[]> {
  const res = await gmgnApiRequest<{ rank?: RankRow[] }>("GET", "/v1/market/rank", {
    chain,
    interval,
    limit,
  });
  if (!res.ok || !res.data) return [];

  const rank = res.data.rank ?? (res.data as unknown as { rank?: RankRow[] }).rank ?? [];
  if (!Array.isArray(rank)) return [];

  return rank
    .filter((r) => r.address && r.symbol)
    .map((r) => ({
      address: String(r.address),
      symbol: String(r.symbol),
      name: String(r.name ?? r.symbol),
      chain: (String(r.chain ?? chain) as GmgnChain) || chain,
      priceUsd: Number(r.price ?? 0),
      change24h: Number(r.price_change_percent1h ?? r.price_change_percent ?? 0),
      volume24h: Number(r.volume ?? 0),
      liquidityUsd: Number(r.liquidity ?? 0),
      marketCap: Number(r.market_cap ?? 0),
      logo: r.logo ? String(r.logo) : undefined,
    }));
}

export async function probeGmgn(): Promise<{
  ok: boolean;
  configured: boolean;
  error?: string;
  trendingCount?: number;
}> {
  if (!hasGmgnApiKey()) {
    return { ok: false, configured: false, error: "GMGN_API_KEY not set" };
  }
  const rows = await fetchGmgnMarketRank("sol", "1h", 3);
  if (rows.length > 0) return { ok: true, configured: true, trendingCount: rows.length };
  return { ok: false, configured: true, error: "market rank empty or rate limited" };
}
