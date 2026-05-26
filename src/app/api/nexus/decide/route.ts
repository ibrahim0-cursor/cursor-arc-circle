import { NextResponse } from "next/server";
import { runNexusDecisionForSymbol } from "@/lib/nexus-agent";
import { chainIdFromWallet } from "@/lib/swappable";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      symbol?: string;
      walletChainId?: number;
      chain?: string;
      arcFeeTxHash?: string;
    };
    const preferredChain =
      body.chain ?? (body.walletChainId ? chainIdFromWallet(body.walletChainId) : undefined);
    const decision = await runNexusDecisionForSymbol(
      body.symbol ?? "ETH",
      preferredChain,
      body.arcFeeTxHash,
    );
    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decision failed" },
      { status: 500 },
    );
  }
}
