import { NextResponse } from "next/server";
import { runNexusDecisionForSymbol } from "@/lib/nexus-agent";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { symbol?: string };
    const decision = await runNexusDecisionForSymbol(body.symbol ?? "ETH");
    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decision failed" },
      { status: 500 },
    );
  }
}
