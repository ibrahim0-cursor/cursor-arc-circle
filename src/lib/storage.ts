import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AgentVaultLedger } from "./agent-vault";
import { emptyLedger } from "./agent-vault";
import type { DemoPosition, DemoTradeRecord } from "./demo-trading";
import { getSupabase } from "./supabase";

export type ReasoningFactor = {
  label: string;
  detail: string;
  impact: "bullish" | "bearish" | "neutral";
  weight: number;
};

export type TokenIntel = {
  marketCap?: number;
  fdv?: number;
  holderCount?: number;
  uniqueWallet24h?: number;
  sniperCount?: number;
  top10HolderPercent?: number;
  buy24h?: number;
  sell24h?: number;
  trade24h?: number;
  isMintable?: boolean;
  isFreezable?: boolean;
  whaleCount?: number;
  sniperWallets?: string[];
  insiderCount?: number;
  technical?: TechnicalSnapshot;
};

export type TokenTx = {
  hash?: string;
  type: string;
  side: "buy" | "sell" | "unknown";
  amountUsd: number;
  trader: string;
  timestamp: string;
};

export type TokenWhale = {
  address: string;
  balance: number;
  pct: number;
  label: string;
};

export type TokenInsider = {
  address: string;
  pct: number;
  label: string;
  risk: "high" | "medium" | "low";
};

export type TechnicalSnapshot = {
  rsi: number;
  rsiSignal: string;
  macd: number;
  macdSignal: string;
  trend: string;
  trendLine: string;
  score: number;
};

export type NexusDecision = {
  id: string;
  timestamp: string;
  token: string;
  symbol: string;
  name?: string;
  chainId: string;
  pairAddress?: string;
  dexUrl?: string;
  icon?: string;
  priceUsd: number;
  change24h: number;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  riskScore: number;
  reasoning: string;
  whyAction: string;
  reasoningFactors: ReasoningFactor[];
  intel: TokenIntel;
  arcTxHash?: string;
  arcBlockNumber?: number;
  arcFeeTxHash?: string;
  settlementNetwork?: string;
  feeCurrency?: string;
  volume24h?: number;
  liquidityUsd?: number;
  swappable?: boolean;
  swapCriteriaMet?: string[];
  technical?: TechnicalSnapshot;
};

export type { DemoPosition, DemoTradeRecord };

export type AgentSignal = {
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  riskScore: number;
  reasoning: string;
  whyAction: string;
  reasoningFactors: ReasoningFactor[];
};

export type PrismPrediction = {
  id: string;
  timestamp: string;
  event: string;
  category: "macro" | "geopolitical" | "markets";
  probability: number;
  confidence: number;
  kellyFraction: number;
  horizon: string;
  summary: string;
  reasoning: string;
  sources: string[];
  arcTxHash?: string;
};

/** In-memory fallback for Vercel serverless (read-only FS) */
const memoryStore = new Map<string, unknown>();

function getDataDir() {
  if (process.env.VERCEL) return path.join("/tmp", "arc-circle-data");
  return path.join(process.cwd(), ".data");
}

async function ensureDataDir() {
  const dataDir = getDataDir();
  try {
    await mkdir(dataDir, { recursive: true });
  } catch {
    // ignore — memory store still works
  }
  return dataDir;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  if (memoryStore.has(file)) return memoryStore.get(file) as T;

  try {
    const dataDir = await ensureDataDir();
    const raw = await readFile(path.join(dataDir, file), "utf8");
    const parsed = JSON.parse(raw) as T;
    memoryStore.set(file, parsed);
    return parsed;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  memoryStore.set(file, data);
  try {
    const dataDir = await ensureDataDir();
    await writeFile(path.join(dataDir, file), JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel: keep in memory for this lambda instance
  }
}

export async function getNexusDecisions(limit = 50) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("nexus_decisions")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      return data.map((row) => row.payload as NexusDecision);
    }
    if (error) console.warn("Supabase nexus read:", error.message);
  }

  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  return items.slice(0, limit);
}

export async function addNexusDecision(decision: NexusDecision) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("nexus_decisions").insert({ payload: decision });
    if (error) console.warn("Supabase nexus insert:", error.message);
    else return decision;
  }

  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  items.unshift(decision);
  await writeJson("nexus-decisions.json", items.slice(0, 200));
  return decision;
}

export async function getPrismPredictions(limit = 50) {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("prism_predictions")
      .select("payload")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data?.length) {
      return data.map((row) => row.payload as PrismPrediction);
    }
    if (error) console.warn("Supabase prism read:", error.message);
  }

  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  return items.slice(0, limit);
}

export async function addPrismPrediction(prediction: PrismPrediction) {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("prism_predictions").insert({ payload: prediction });
    if (error) console.warn("Supabase prism insert:", error.message);
    else return prediction;
  }

  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  items.unshift(prediction);
  await writeJson("prism-predictions.json", items.slice(0, 200));
  return prediction;
}

export async function getDemoPositions(wallet: string) {
  const all = await readJson<DemoPosition[]>("demo-positions.json", []);
  return all.filter((p) => p.wallet.toLowerCase() === wallet.toLowerCase() && p.tokenAmount > 0);
}

async function getAllDemoPositions() {
  return readJson<DemoPosition[]>("demo-positions.json", []);
}

export async function getDemoTrades(wallet: string, limit = 30) {
  const all = await readJson<DemoTradeRecord[]>("demo-trades.json", []);
  return all
    .filter((t) => t.wallet.toLowerCase() === wallet.toLowerCase())
    .slice(0, limit);
}

export async function saveDemoTrade(trade: DemoTradeRecord, walletPositions: DemoPosition[]) {
  const trades = await readJson<DemoTradeRecord[]>("demo-trades.json", []);
  trades.unshift(trade);
  await writeJson("demo-trades.json", trades.slice(0, 500));

  const all = await getAllDemoPositions();
  const others = all.filter((p) => p.wallet.toLowerCase() !== trade.wallet.toLowerCase());
  await writeJson("demo-positions.json", [...walletPositions, ...others].slice(0, 500));
  return trade;
}

type AgentVaultStore = {
  ledgers: Record<string, AgentVaultLedger>;
  lastScannedBlock?: string;
};

async function readVaultStore(): Promise<AgentVaultStore> {
  return readJson<AgentVaultStore>("agent-vault-ledger.json", { ledgers: {} });
}

async function writeVaultStore(store: AgentVaultStore) {
  await writeJson("agent-vault-ledger.json", store);
}

export async function getAgentVaultLedger(ownerWallet: string): Promise<AgentVaultLedger> {
  const store = await readVaultStore();
  const key = ownerWallet.toLowerCase();
  return store.ledgers[key] ?? emptyLedger(ownerWallet);
}

export async function saveAgentVaultLedger(ledger: AgentVaultLedger) {
  const store = await readVaultStore();
  store.ledgers[ledger.ownerWallet.toLowerCase()] = ledger;
  await writeVaultStore(store);
  return ledger;
}

export async function creditAgentVault(
  ownerWallet: string,
  amountUsdc: number,
  txHash: string,
): Promise<AgentVaultLedger> {
  const ledger = await getAgentVaultLedger(ownerWallet);
  if (ledger.creditedTxHashes.includes(txHash.toLowerCase())) return ledger;

  ledger.balanceUsdc += amountUsdc;
  ledger.totalDeposited += amountUsdc;
  ledger.creditedTxHashes.push(txHash.toLowerCase());
  ledger.deposits.unshift({
    txHash,
    amountUsdc,
    at: new Date().toISOString(),
  });
  ledger.updatedAt = new Date().toISOString();
  return saveAgentVaultLedger(ledger);
}

export async function debitAgentVault(
  ownerWallet: string,
  amountUsdc: number,
): Promise<AgentVaultLedger> {
  const ledger = await getAgentVaultLedger(ownerWallet);
  if (ledger.balanceUsdc < amountUsdc) {
    throw new Error(`Insufficient agent vault balance (have $${ledger.balanceUsdc.toFixed(2)}, need $${amountUsdc.toFixed(2)})`);
  }
  ledger.balanceUsdc -= amountUsdc;
  ledger.totalSpent += amountUsdc;
  ledger.updatedAt = new Date().toISOString();
  return saveAgentVaultLedger(ledger);
}
