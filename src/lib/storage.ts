import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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
  volume24h?: number;
  liquidityUsd?: number;
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

const dataDir = path.join(process.cwd(), ".data");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const raw = await readFile(path.join(dataDir, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await ensureDataDir();
  await writeFile(path.join(dataDir, file), JSON.stringify(data, null, 2), "utf8");
}

export async function getNexusDecisions(limit = 50) {
  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  return items.slice(0, limit);
}

export async function addNexusDecision(decision: NexusDecision) {
  const items = await readJson<NexusDecision[]>("nexus-decisions.json", []);
  items.unshift(decision);
  await writeJson("nexus-decisions.json", items.slice(0, 200));
  return decision;
}

export async function getPrismPredictions(limit = 50) {
  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  return items.slice(0, limit);
}

export async function addPrismPrediction(prediction: PrismPrediction) {
  const items = await readJson<PrismPrediction[]>("prism-predictions.json", []);
  items.unshift(prediction);
  await writeJson("prism-predictions.json", items.slice(0, 200));
  return prediction;
}
