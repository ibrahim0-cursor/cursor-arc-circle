import { NextResponse } from "next/server";
import { getDemoPositions, getDemoTrades } from "@/lib/storage";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet query param required" }, { status: 400 });
  }

  const [positions, trades] = await Promise.all([
    getDemoPositions(wallet),
    getDemoTrades(wallet, 20),
  ]);

  const totalValueUsd = positions.reduce((sum, p) => sum + p.tokenAmount * p.priceUsd, 0);
  const totalSpentUsd = positions.reduce((sum, p) => sum + p.usdcSpent, 0);

  return NextResponse.json({
    wallet,
    positions,
    trades,
    summary: {
      openPositions: positions.length,
      totalValueUsd,
      totalSpentUsd,
      unrealizedPnlUsd: totalValueUsd - totalSpentUsd,
      settlement: "Arc Testnet USDC",
    },
  });
}
