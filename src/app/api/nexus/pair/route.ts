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
    return NextResponse.json(
      {
        symbol: pair.symbol,
        name: pair.name,
        icon: pair.icon,
        pairAddress: pair.pairAddress,
        url: pair.url,
        priceUsd: pair.priceUsd,
        change24h: pair.change24h,
        volume24h: pair.volume24h,
        liquidityUsd: pair.liquidityUsd,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
        txns24h: pair.txns24h,
        priceChange: pair.priceChange,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pair lookup failed" },
      { status: 500 },
    );
  }
}
