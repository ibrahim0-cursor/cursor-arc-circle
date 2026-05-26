import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  try {
    const pair = await fetchTokenByAddress(chainId, address);
    if (!pair?.pairAddress) {
      return NextResponse.json({ pairAddress: null, url: null });
    }
    return NextResponse.json({
      pairAddress: pair.pairAddress,
      url: pair.url,
      priceUsd: pair.priceUsd,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pair lookup failed" },
      { status: 500 },
    );
  }
}
