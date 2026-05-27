#!/usr/bin/env node
/**
 * Full integration scan for NEXUS (reads server env via /api/status).
 * Usage: node scripts/nexus-api-scan.mjs [baseUrl]
 */

const base = (process.argv[2] ?? "https://trader-arc.vercel.app").replace(/\/$/, "");

const checks = [
  ["Arc RPC", (d) => d.arc?.connected],
  ["Supabase", (d) => d.supabase],
  ["Supabase tables", (d) => d.supabaseAllTablesOk],
  ["Demo portfolio", (d) => d.demoPortfolio?.tableOk],
  ["Birdeye key", (d) => d.birdeye],
  ["Birdeye probe", (d) => d.birdeyeProbe?.ok, (d) => d.birdeyeProbe?.error],
  ["Groq AI", (d) => d.groq],
  ["OpenAI", (d) => d.openai],
  ["News API", (d) => d.newsapi],
  ["CoinGecko", (d) => d.coingecko],
  ["0x swap", (d) => d.zeroX],
  ["GeckoTerminal", (d) => d.geckoProbe?.ok, (d) => d.geckoProbe?.error],
  ["Reddit", (d) => d.redditProbe?.ok ?? d.reddit, (d) => d.redditProbe?.error],
  ["Reddit public", (d) => d.redditPublicProbe?.ok, (d) => d.redditPublicProbe?.error],
  ["ApeWisdom", (d) => d.apeWisdomProbe?.ok, (d) => d.apeWisdomProbe?.error],
  ["Hacker News", (d) => d.hackerNewsProbe?.ok, (d) => d.hackerNewsProbe?.error],
  ["Perception", (d) => d.perceptionProbe?.ok, (d) => d.perceptionProbe?.error],
  ["GMGN", (d) => d.gmgnProbe?.ok, (d) => d.gmgnProbe?.error],
  ["Telegram", (d) => d.telegramProbe?.ok, (d) => d.telegramProbe?.error],
  ["Discord", (d) => d.discordProbe?.ok, (d) => d.discordProbe?.error],
  ["Stocktwits", (d) => d.stocktwitsProbe?.ok, (d) => d.stocktwitsProbe?.error],
  ["RapidAPI X", (d) => d.rapidTwitterProbe?.ok, (d) => d.rapidTwitterProbe?.error],
  ["Social Data", (d) => d.socialDataProbe?.ok, (d) => d.socialDataProbe?.error],
  ["LunarCrush", (d) => d.lunarcrushProbe?.ok, (d) => d.lunarcrushProbe?.error],
  ["Neynar", (d) => d.neynarProbe?.ok, (d) => d.neynarProbe?.error],
  ["Moralis", (d) => d.moralisProbe?.ok, (d) => d.moralisProbe?.error],
  ["Etherscan", (d) => d.etherscanProbe?.ok, (d) => d.etherscanProbe?.error],
  ["GitHub", (d) => d.githubProbe?.ok, (d) => d.githubProbe?.error],
];

async function probeFeed() {
  try {
    const res = await fetch(`${base}/api/nexus/feed?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json();
    const n = Array.isArray(data.tokens) ? data.tokens.length : 0;
    return { ok: res.ok && n > 0, detail: res.ok ? `${n} tokens` : data.error ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function main() {
  console.log(`\nNEXUS API scan — ${base}\n`);

  const statusRes = await fetch(`${base}/api/status?t=${Date.now()}`, { cache: "no-store" });
  const data = await statusRes.json();

  let fail = 0;
  for (const [name, test, errFn] of checks) {
    const ok = Boolean(test(data));
    const err = errFn?.(data);
    const mark = ok ? "✓" : "✗";
    if (!ok) fail++;
    console.log(`${mark} ${name.padEnd(18)} ${ok ? "ok" : err ?? "missing / failed"}`);
  }

  const feed = await probeFeed();
  console.log(`${feed.ok ? "✓" : "✗"} ${"NEXUS feed".padEnd(18)} ${feed.detail}`);
  if (!feed.ok) fail++;

  console.log(`\nAI runtime: ${data.mode} (${data.aiProvider}) · social: ${data.socialStack ?? "?"}\n`);
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
