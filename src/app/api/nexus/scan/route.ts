import { NextResponse } from "next/server";
import { runAlphaScan, runNexusScan } from "@/lib/nexus-agent";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { chainIdFromWallet } from "@/lib/swappable";
import { ALPHA_SCAN_LIMIT, MEMORY_SCAN_LIMIT } from "@/lib/feed-config";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      walletChainId?: number;
      chain?: string;
      arcFeeTxHash?: string;
      mode?: "memory" | "alpha";
      chainId?: string;
      tokenAddress?: string;
    };
    const preferredChain =
      body.chain ?? (body.walletChainId ? chainIdFromWallet(body.walletChainId) : undefined);

    if (body.mode === "alpha") {
      let focusToken;
      if (body.chainId && body.tokenAddress) {
        focusToken =
          (await fetchTokenByAddress(body.chainId, body.tokenAddress)) ?? undefined;
      }
      const result = await runAlphaScan(ALPHA_SCAN_LIMIT, {
        preferredChain,
        focusToken,
      });
      return NextResponse.json(result);
    }

    const result = await runNexusScan(MEMORY_SCAN_LIMIT, preferredChain, body.arcFeeTxHash);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
