import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const [arc, circle] = await Promise.all([getArcStatus(), getCircleStatus()]);
  return NextResponse.json({
    arc,
    circle,
    supabase: isSupabaseConfigured(),
    zeroX: Boolean(process.env.ZEROX_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    mode: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? "ai" : "heuristic",
  });
}
