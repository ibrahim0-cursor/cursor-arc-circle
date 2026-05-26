/**
 * Simulates fetchTokenDetection call order (with delays) — no Next.js required.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const key = process.env.BIRDEYE_API_KEY;
const chain = "arbitrum";
const addr = "0x912ce59144191c1204e64559fe8253a0e49e6548";

async function fetch(path) {
  await new Promise((r) => setTimeout(r, 2000));
  const res = await fetch(`https://public-api.birdeye.so${path}`, {
    headers: { "X-API-KEY": key, "x-chain": chain, accept: "application/json" },
  });
  const j = await res.json();
  const ok = res.ok && j.success !== false;
  return { ok, status: res.status, items: j.data?.items?.length, holder: j.data?.holder, error: j.message };
}

console.log("Key present:", Boolean(key));

const whales = await fetch(
  `/defi/v2/tokens/top_traders?address=${addr}&time_frame=24h&sort_by=volume&sort_type=desc&offset=0&limit=8`,
);
console.log("whales:", whales);

const trades = await fetch(`/defi/txs/token?address=${addr}&tx_type=swap&limit=8`);
console.log("trades:", trades);

const overview = await fetch(`/defi/token_overview?address=${addr}`);
console.log("overview:", overview);

const live = whales.ok && whales.items > 0 || trades.ok && trades.items > 0;
console.log("\nWould show LIVE:", live);
