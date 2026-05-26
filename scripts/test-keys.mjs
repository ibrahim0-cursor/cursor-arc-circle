import OpenAI from "openai";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const boostsRes = await fetch("https://api.dexscreener.com/token-boosts/top/v1");
  const boosts = await boostsRes.json();
  console.log("boosts ok", Array.isArray(boosts), boosts.length);

  const t = boosts[0];
  const pairsRes = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/${t.chainId}/${t.tokenAddress}`,
  );
  console.log("pairs status", pairsRes.status);
  const pairs = await pairsRes.json();
  console.log("pairs ok", Array.isArray(pairs), pairs[0]?.baseToken?.symbol);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Return JSON with ok:true" }],
    response_format: { type: "json_object" },
  });
  console.log("openai", completion.choices[0]?.message?.content);
}

main().catch((error) => {
  console.error("FAIL", error.message);
  process.exit(1);
});
