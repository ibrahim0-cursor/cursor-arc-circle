import { NextResponse } from "next/server";
import { runAlphaScan, runNexusScan } from "@/lib/nexus-agent";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { chainIdFromWallet } from "@/lib/swappable";
import { ALPHA_SCAN_LIMIT, MEMORY_SCAN_LIMIT } from "@/lib/feed-config";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    walletChainId?: number;
    chain?: string;
    arcFeeTxHash?: string;
    mode?: "memory" | "alpha";
    chainId?: string;
    tokenAddress?: string;
  };

  try {
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
    const message = error instanceof Error ? error.message : "Scan failed";
    console.error("[nexus/scan]", message, error);
    return NextResponse.json(
      {
        error: message,
        hint:
          body.mode === "alpha"
            ? "Alpha scan analyzes ~20 tokens with Birdeye, news, and AI — retry if APIs were slow."
            : "Memory scan archives ~15 tokens — check DexScreener and wallet on Arc Testnet.",
      },
      { status: 500 },
    );
  }
}
