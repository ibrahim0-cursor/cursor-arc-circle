import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";
import { hasBirdeyeKey } from "@/lib/birdeye-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [arc, circle] = await Promise.all([getArcStatus(), getCircleStatus()]);
  return NextResponse.json({
    arc,
    circle,
    supabase: isSupabaseConfigured(),
    birdeye: hasBirdeyeKey(),
    zeroX: Boolean(process.env.ZEROX_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    arcRpc: Boolean(process.env.NEXT_PUBLIC_ARC_RPC_URL?.trim()),
    mode: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? "ai" : "heuristic",
    deployHint: "If features look old, redeploy Vercel after pushing latest GitHub commit.",
  });
}
