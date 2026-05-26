import { NextResponse } from "next/server";
import { runNexusScan } from "@/lib/nexus-agent";
import { chainIdFromWallet } from "@/lib/swappable";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      walletChainId?: number;
      chain?: string;
      arcFeeTxHash?: string;
    };
    const preferredChain =
      body.chain ?? (body.walletChainId ? chainIdFromWallet(body.walletChainId) : undefined);

    const result = await runNexusScan(15, preferredChain, body.arcFeeTxHash);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
