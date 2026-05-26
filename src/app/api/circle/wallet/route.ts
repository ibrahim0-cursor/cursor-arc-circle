import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createCircleWallet, getCircleBalances } from "@/lib/circle";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";

export async function POST() {
  try {
    const wallet = await createCircleWallet(randomUUID());
    const balances = wallet.walletId
      ? await getCircleBalances(wallet.walletId)
      : { demo: true, balances: [] };

    return NextResponse.json({ ...wallet, balances });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet init failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const walletId = new URL(request.url).searchParams.get("walletId");
  if (walletId) {
    const balances = await getCircleBalances(walletId);
    return NextResponse.json(balances);
  }
  const arc = await getArcStatus();
  const circle = await getCircleStatus();
  return NextResponse.json({ arc, circle });
}
