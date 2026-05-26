import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { applyDemoTrade, buildDemoQuote, type DemoTradeSide } from "@/lib/demo-trading";
import { demoNetworkById, type DemoTradeNetworkId } from "@/lib/testnet-chains";
import { getDemoPositions, saveDemoTrade } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      wallet: string;
      side: DemoTradeSide;
      symbol: string;
      tokenAddress: string;
      sourceChain: string;
      tradeNetwork: DemoTradeNetworkId;
      usdcAmount?: number;
      tokenAmount?: number;
      priceUsd: number;
      arcFeeTxHash: string;
    };

    if (!body.wallet || !body.arcFeeTxHash) {
      return NextResponse.json({ error: "wallet and arcFeeTxHash required" }, { status: 400 });
    }

    demoNetworkById(body.tradeNetwork);

    const positions = await getDemoPositions(body.wallet);
    const position = positions.find(
      (p) =>
        p.tokenAddress.toLowerCase() === body.tokenAddress.toLowerCase() &&
        p.tradeNetwork === body.tradeNetwork,
    );

    const quote = buildDemoQuote({
      side: body.side,
      usdcAmount: body.usdcAmount,
      tokenAmount: body.tokenAmount,
      priceUsd: body.priceUsd,
      position,
    });

    const trade = {
      id: randomUUID(),
      wallet: body.wallet,
      side: body.side,
      symbol: body.symbol,
      tokenAddress: body.tokenAddress,
      sourceChain: body.sourceChain,
      tradeNetwork: body.tradeNetwork,
      usdcAmount: body.side === "buy" ? (quote.usdcIn ?? 0) : (quote.usdcOut ?? 0),
      tokenAmount: body.side === "buy" ? (quote.tokenOut ?? 0) : (quote.tokenIn ?? 0),
      priceUsd: body.priceUsd,
      arcFeeTxHash: body.arcFeeTxHash,
      timestamp: new Date().toISOString(),
      pnlUsd: "pnlUsd" in quote ? quote.pnlUsd : undefined,
    };

    const { positions: nextPositions } = applyDemoTrade([...positions], trade);
    await saveDemoTrade(trade, nextPositions);

    return NextResponse.json({
      trade,
      quote,
      positions: nextPositions,
      settlement: "Arc Testnet USDC",
      network: demoNetworkById(body.tradeNetwork).label,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Demo trade failed" },
      { status: 400 },
    );
  }
}
