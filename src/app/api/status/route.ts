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

export const dynamic = "force-dynamic";

export async function GET() {
  const premiumSocial = usePremiumSocialApis();
  const [arc, circle, supabaseHealth, lunarcrushProbe, neynarProbe, redditProbe] = await Promise.all([
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
  ]);
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
    reddit: hasRedditCredentials(),
    redditProbe,
    socialStack: premiumSocial ? "premium" : "free",
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
