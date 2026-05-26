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
const addr = "0x912CE59144191C1204E64559FE8253a0e49E6548";
const chain = "arbitrum";

async function hit(path) {
  await new Promise((r) => setTimeout(r, 1500));
  const res = await fetch(`https://public-api.birdeye.so${path}`, {
    headers: { "X-API-KEY": key, "x-chain": chain, accept: "application/json" },
  });
  const j = await res.json();
  console.log(
    res.status,
    path.split("?")[0],
    "success=",
    j.success,
    "items=",
    j.data?.items?.length,
    "price=",
    j.data?.price,
    "holder=",
    j.data?.holder,
    "buy24h=",
    j.data?.buy24h,
  );
  if (j.data?.items?.[0]) console.log("  first item keys:", Object.keys(j.data.items[0]).join(","));
}

await hit(`/defi/token_overview?address=${addr}`);
await hit(`/defi/v2/tokens/top_traders?address=${addr}&time_frame=24h&sort_by=volume&sort_type=desc&offset=0&limit=5`);
await hit(`/defi/v3/token/txs?address=${addr}&limit=5&sort_by=block_unix_time&sort_type=desc&tx_type=swap`);
await hit(`/defi/txs/token?address=${addr}&tx_type=swap&limit=3`);
