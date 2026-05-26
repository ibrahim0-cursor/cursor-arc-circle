import { NextResponse } from "next/server";
import { fetchTokenDetection } from "@/lib/birdeye";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");
  const buys = Number(searchParams.get("buys") ?? 0);
  const sells = Number(searchParams.get("sells") ?? 0);
  const volume = Number(searchParams.get("volume") ?? 0);

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  try {
    const detection = await fetchTokenDetection(address, chainId, {
      buys: buys || undefined,
      sells: sells || undefined,
      volume24h: volume || undefined,
    });
    return NextResponse.json(detection);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 },
    );
  }
}
