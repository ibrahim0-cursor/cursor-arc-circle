import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { probeSupabaseTables } from "@/lib/supabase-health";
import { hasBirdeyeKey, birdeyeFetchJson } from "@/lib/birdeye-client";
import { probeLunarCrush, hasLunarCrushKey } from "@/lib/lunarcrush";
import { probeNeynar, hasNeynarKey } from "@/lib/neynar";
import { probeReddit, hasRedditCredentials } from "@/lib/reddit";
import { usePremiumSocialApis } from "@/lib/social-config";
import { probeGeckoTerminal } from "@/lib/geckoterminal";
import { hasMoralisKey, probeMoralis } from "@/lib/moralis";
import { hasEtherscanKey, probeEtherscan } from "@/lib/etherscan";
import { hasGithubToken, probeGithub } from "@/lib/github-dev";
import { hasTelegramBotToken, probeTelegram } from "@/lib/telegram-bot";
import { probeDiscord, hasDiscordBotToken, hasDiscordOAuthClient } from "@/lib/discord-bot";
import { hasStocktwitsCredentials, probeStocktwits } from "@/lib/stocktwits";
import { hasRapidApiTwitter, probeRapidApiTwitter } from "@/lib/rapidapi-twitter";
import { hasSocialDataKey, probeSocialData } from "@/lib/social-data-api";
import { probeRedditPublic } from "@/lib/reddit-public";
import { probeApeWisdom } from "@/lib/apewisdom";
import { probeHackerNews } from "@/lib/hackernews";
import { hasPerceptionKey, probePerception } from "@/lib/perception";

export const dynamic = "force-dynamic";

export async function GET() {
  const premiumSocial = usePremiumSocialApis();
  const [
    arc,
    circle,
    supabaseHealth,
    lunarcrushProbe,
    neynarProbe,
    redditProbe,
    geckoProbe,
    moralisProbe,
    etherscanProbe,
    githubProbe,
    telegramProbe,
    discordProbe,
    stocktwitsProbe,
    rapidTwitterProbe,
    socialDataProbe,
    redditPublicProbe,
    apeWisdomProbe,
    hackerNewsProbe,
    perceptionProbe,
  ] = await Promise.all([
    getArcStatus(),
    getCircleStatus(),
    probeSupabaseTables(),
    premiumSocial && hasLunarCrushKey()
      ? probeLunarCrush()
      : Promise.resolve({
          ok: false,
          configured: hasLunarCrushKey(),
          skipped: true,
          error: "free mode (set SOCIAL_USE_PREMIUM=true to probe)",
        }),
    premiumSocial && hasNeynarKey() ? probeNeynar() : Promise.resolve({
      ok: false,
      configured: hasNeynarKey(),
      skipped: true,
      error: "free mode",
    }),
    probeReddit(),
    probeGeckoTerminal(),
    hasMoralisKey() ? probeMoralis() : Promise.resolve({ ok: false, error: "not configured" }),
    hasEtherscanKey() ? probeEtherscan() : Promise.resolve({ ok: false, error: "not configured" }),
    probeGithub(),
    hasTelegramBotToken() ? probeTelegram() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
    probeDiscord(),
    hasStocktwitsCredentials() ? probeStocktwits() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
    hasRapidApiTwitter() ? probeRapidApiTwitter() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
    hasSocialDataKey() ? probeSocialData() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
    probeRedditPublic(),
    probeApeWisdom(),
    probeHackerNews(),
    hasPerceptionKey() ? probePerception() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
  ]);
  const redditEffective =
    redditProbe.ok || redditPublicProbe.ok
      ? { ok: true, oauth: redditProbe.ok, public: redditPublicProbe.ok }
      : {
          ok: false,
          oauth: redditProbe.configured,
          public: redditPublicProbe.configured,
          error: redditProbe.error ?? redditPublicProbe.error,
        };
  const demoPortfolio = supabaseHealth.demoPortfolio;

  let birdeyeProbe: { ok: boolean; error?: string } = { ok: false, error: "no key" };
  if (hasBirdeyeKey()) {
    const probe = await birdeyeFetchJson<{ data?: { symbol?: string } }>(
      "/defi/token_overview?address=0x912ce59144191c1204e64559fe8253a0e49e6548",
      "arbitrum",
    );
    const hasOverview = Boolean(probe.data?.data?.symbol);
    birdeyeProbe =
      probe.ok && hasOverview
        ? { ok: true }
        : {
            ok: false,
            error:
              probe.error?.toLowerCase().includes("compute units")
                ? "Compute units limit — wait or upgrade Birdeye plan; agent still uses DexScreener"
                : probe.error ?? (probe.ok ? "empty response" : `HTTP ${probe.status}`),
          };
  }

  return NextResponse.json({
    arc,
    circle,
    supabase: isSupabaseConfigured(),
    supabaseTables: supabaseHealth.tables,
    supabaseAllTablesOk: supabaseHealth.allTablesOk,
    demoPortfolio,
    birdeye: hasBirdeyeKey(),
    birdeyeProbe,
    zeroX: Boolean(process.env.ZEROX_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    arcRpc: Boolean(process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim()),
    newsapi: Boolean(process.env.NEWS_API_KEY?.trim()),
    coingecko: Boolean(process.env.COINGECKO_API_KEY?.trim()),
    groq: Boolean(process.env.GROQ_API_KEY?.trim()),
    dexpaprika: true,
    cryptoNews: true,
    lunarcrush: hasLunarCrushKey(),
    lunarcrushProbe,
    neynar: hasNeynarKey(),
    neynarProbe: {
      ...neynarProbe,
      searchEnabled: process.env.NEYNAR_USE_SEARCH?.trim().toLowerCase() === "true",
    },
    reddit: hasRedditCredentials() || redditPublicProbe.ok,
    redditProbe: redditEffective,
    redditPublicProbe,
    apeWisdomProbe,
    hackerNewsProbe,
    perception: hasPerceptionKey(),
    perceptionProbe,
    socialStack: premiumSocial ? "premium" : "free",
    geckoterminal: true,
    geckoProbe,
    moralis: hasMoralisKey(),
    moralisProbe,
    etherscan: hasEtherscanKey(),
    etherscanProbe,
    github: hasGithubToken(),
    githubProbe,
    telegram: hasTelegramBotToken(),
    telegramProbe,
    discordBot: hasDiscordBotToken(),
    discordOAuth: hasDiscordOAuthClient(),
    discordProbe,
    stocktwits: hasStocktwitsCredentials(),
    stocktwitsProbe,
    rapidApiTwitter: hasRapidApiTwitter(),
    rapidTwitterProbe,
    socialData: hasSocialDataKey(),
    socialDataProbe,
    alphaLayers:
      "apewisdom|reddit-public|hackernews|perception|narrative|telegram|discord|github|on-chain",
    mode:
      process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
        ? "ai"
        : "heuristic",
    aiProvider: process.env.GROQ_API_KEY
      ? "groq"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : "heuristic",
  });
}
