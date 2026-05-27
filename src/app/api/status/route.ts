import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { probeSupabaseTables } from "@/lib/supabase-health";
import { hasBirdeyeKey, probeBirdeyeHealth } from "@/lib/birdeye-client";
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
import { hasGmgnApiKey, hasGmgnPrivateKey, probeGmgn } from "@/lib/gmgn-client";
import { probeGmgnAnalyticsSkills } from "@/lib/gmgn-discovery";
import { probeGmgnMonitorSkills } from "@/lib/gmgn-monitor";
import { hasOpenNewsToken, probeOpenNews } from "@/lib/opennews-6551";
import { hasOpenTwitterToken, probeOpenTwitter } from "@/lib/opentwitter-6551";

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
    gmgnProbe,
    gmgnAnalyticsProbe,
    gmgnMonitorProbe,
    opennewsProbe,
    opentwitterProbe,
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
    probeGmgn(),
    hasGmgnApiKey()
      ? probeGmgnAnalyticsSkills("sol")
      : Promise.resolve({ ok: false, skills: {} }),
    hasGmgnApiKey()
      ? probeGmgnMonitorSkills("sol")
      : Promise.resolve({ ok: false, skills: {} }),
    hasOpenNewsToken() ? probeOpenNews() : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
    hasOpenTwitterToken()
      ? probeOpenTwitter()
      : Promise.resolve({ ok: false, configured: false, error: "not configured" }),
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

  const birdeyeProbe = hasBirdeyeKey()
    ? await probeBirdeyeHealth()
    : { ok: false, error: "no key" };

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
    gmgn: hasGmgnApiKey(),
    gmgnPrivateKey: hasGmgnPrivateKey(),
    gmgnProbe,
    gmgnAnalyticsProbe,
    gmgnMonitorProbe,
    opennews: hasOpenNewsToken(),
    opennewsProbe,
    opentwitter: hasOpenTwitterToken(),
    opentwitterProbe,
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
      "gmgn|apewisdom|reddit-public|hackernews|perception|narrative|telegram|discord|github|on-chain",
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
