import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { probeDemoPortfolioTable } from "@/lib/supabase-health";
import { hasBirdeyeKey, birdeyeFetchJson } from "@/lib/birdeye-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [arc, circle, demoPortfolio] = await Promise.all([
    getArcStatus(),
    getCircleStatus(),
    probeDemoPortfolioTable(),
  ]);

  let birdeyeProbe: { ok: boolean; error?: string } = { ok: false, error: "no key" };
  if (hasBirdeyeKey()) {
    const probe = await birdeyeFetchJson<{ data?: { items?: unknown[] } }>(
      "/defi/v2/tokens/top_traders?address=0x912ce59144191c1204e64559fe8253a0e49e6548&time_frame=24h&sort_by=volume&sort_type=desc&offset=0&limit=1",
      "arbitrum",
    );
    const hasItems = (probe.data?.data?.items?.length ?? 0) > 0;
    birdeyeProbe =
      probe.ok && hasItems
        ? { ok: true }
        : { ok: false, error: probe.error ?? (probe.ok ? "empty response" : `HTTP ${probe.status}`) };
  }

  return NextResponse.json({
    arc,
    circle,
    supabase: isSupabaseConfigured(),
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
