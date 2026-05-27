import { NextResponse } from "next/server";
import { runAlphaScan } from "@/lib/nexus-agent";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { chainIdFromWallet } from "@/lib/swappable";
import { ALPHA_SCAN_LIMIT } from "@/lib/feed-config";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    walletChainId?: number;
    chain?: string;
    arcFeeTxHash?: string;
    mode?: "alpha";
    chainId?: string;
    tokenAddress?: string;
    liveFeedKeys?: string[];
  };

  try {
    const preferredChain =
      body.chain ?? (body.walletChainId ? chainIdFromWallet(body.walletChainId) : undefined);

    let focusToken;
    if (body.chainId && body.tokenAddress) {
      focusToken = (await fetchTokenByAddress(body.chainId, body.tokenAddress)) ?? undefined;
    }
    const result = await runAlphaScan(ALPHA_SCAN_LIMIT, {
      preferredChain,
      focusToken,
      liveFeedKeys: body.liveFeedKeys,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    console.error("[nexus/scan]", message, error);
    return NextResponse.json(
      {
        error: message,
        hint: "Scan timed out or upstream data was slow — retry in a moment.",
      },
      { status: 500 },
    );
  }
}
