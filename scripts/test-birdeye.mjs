import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const key = process.env.BIRDEYE_API_KEY;
if (!key) {
  console.error("BIRDEYE_API_KEY missing");
  process.exit(1);
}

const tests = [
  {
    name: "arbitrum ARB",
    chain: "arbitrum",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
  },
  {
    name: "base WETH",
    chain: "base",
    address: "0x4200000000000000000000000000000000000006",
  },
];

async function hit(path, chain) {
  const res = await fetch(`https://public-api.birdeye.so${path}`, {
    headers: { "X-API-KEY": key, "x-chain": chain, accept: "application/json" },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 200);
  }
  return { status: res.status, json };
}

for (const t of tests) {
  console.log(`\n=== ${t.name} ===`);
  for (const ep of [
    `/defi/token_overview?address=${t.address}`,
    `/defi/token_security?address=${t.address}`,
    `/defi/v3/token/holder?address=${t.address}&offset=0&limit=5`,
    `/defi/txs/token?address=${t.address}&tx_type=swap&limit=3`,
  ]) {
    const r = await hit(ep, t.chain);
    const ok = r.status === 200;
    const preview =
      typeof r.json === "object"
        ? JSON.stringify(r.json).slice(0, 120)
        : String(r.json);
    console.log(`${ok ? "OK" : "FAIL"} ${r.status} ${ep.split("?")[0]} → ${preview}`);
  }
}
