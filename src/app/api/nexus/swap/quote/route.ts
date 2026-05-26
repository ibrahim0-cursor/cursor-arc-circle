import { NextResponse } from "next/server";
import { evmChainId, fetchZeroXQuote, isEvmChain, validateEvmAddress } from "@/lib/swap";

const USDC: Record<number, string> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      chainId?: string;
      buyToken?: string;
      sellAmount?: string;
      taker?: string;
      side?: "buy" | "sell";
    };

    const { chainId, buyToken, sellAmount = "10", taker, side = "buy" } = body;
    if (!chainId || !buyToken || !taker) {
      return NextResponse.json({ error: "Missing swap parameters" }, { status: 400 });
    }

    if (!isEvmChain(chainId)) {
      return NextResponse.json({
        demo: true,
        chain: chainId,
        message: "Use Jupiter swap for Solana tokens",
        jupiterUrl: `https://jup.ag/swap/SOL-${buyToken}`,
      });
    }

    const numericChain = evmChainId(chainId)!;
    const validatedBuy = validateEvmAddress(buyToken);
    const validatedTaker = validateEvmAddress(taker);
    if (!validatedBuy || !validatedTaker) {
      return NextResponse.json({ error: "Invalid EVM address" }, { status: 400 });
    }

    const usdc = USDC[numericChain];
    if (!usdc) {
      return NextResponse.json({ error: "Chain not supported for swap" }, { status: 400 });
    }

    const sellToken = side === "buy" ? usdc : validatedBuy;
    const buy = side === "buy" ? validatedBuy : usdc;
    const amount = side === "buy" ? String(Number(sellAmount) * 1_000_000) : sellAmount;

    const quote = await fetchZeroXQuote({
      chainId: numericChain,
      sellToken,
      buyToken: buy,
      sellAmount: amount,
      taker: validatedTaker,
    });

    return NextResponse.json(quote);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quote failed" },
      { status: 500 },
    );
  }
}
