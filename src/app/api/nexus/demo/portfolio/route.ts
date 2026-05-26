import { NextResponse } from "next/server";
import { markPositionsToMarket } from "@/lib/demo-trading";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { getDemoPositions, getDemoTrades } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function livePrice(chainId: string, tokenAddress: string) {
  const token = await fetchTokenByAddress(chainId, tokenAddress);
  return token?.priceUsd ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
  }

  const [rawPositions, trades] = await Promise.all([
    getDemoPositions(wallet),
    getDemoTrades(wallet, 20),
  ]);

  const positions = await markPositionsToMarket(rawPositions, livePrice);

  const totalValueUsd = positions.reduce((sum, p) => sum + p.currentValueUsd, 0);
  const totalSpentUsd = positions.reduce((sum, p) => sum + p.usdcSpent, 0);
  const realizedPnlUsd = trades.reduce((sum, t) => sum + (t.pnlUsd ?? 0), 0);

  return NextResponse.json({
    wallet,
    positions,
    trades,
    summary: {
      openPositions: positions.length,
      totalValueUsd,
      totalSpentUsd,
      unrealizedPnlUsd: totalValueUsd - totalSpentUsd,
      realizedPnlUsd,
      totalPnlUsd: totalValueUsd - totalSpentUsd + realizedPnlUsd,
      settlement: "Arc Testnet USDC",
    },
  });
}
