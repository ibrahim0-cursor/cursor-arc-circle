import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { analyzeTokenSignal } from "@/lib/nexus-agent";
import { fetchTokenIntel } from "@/lib/birdeye";
import { birdeyeChainFor } from "@/lib/testnet-chains";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      chainId: string;
      tokenAddress: string;
      deep?: boolean;
    };

    if (!body.chainId || !body.tokenAddress) {
      return NextResponse.json({ error: "chainId and tokenAddress required" }, { status: 400 });
    }

    const token = await fetchTokenByAddress(body.chainId, body.tokenAddress);
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const { intel } = await fetchTokenIntel(token.tokenAddress, birdeyeChainFor(token.chainId));
    const agent = await analyzeTokenSignal(token, intel, body.deep ?? false);

    return NextResponse.json({ token, intel, agent, mode: body.deep ? "deep" : "quick" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 500 },
    );
  }
}
