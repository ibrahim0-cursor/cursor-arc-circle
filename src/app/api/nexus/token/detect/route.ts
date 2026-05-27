import { NextResponse } from "next/server";
import { hasBirdeyeKey } from "@/lib/birdeye-client";
import { fetchMergedTokenDetection } from "@/lib/token-detection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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
    const detection = await fetchMergedTokenDetection(
      address,
      chainId,
      { buys, sells, volume },
      { birdeyeMode: searchParams.get("full") === "1" ? "full" : "lite" },
    );
    return NextResponse.json({
      ...detection,
      serverHasKey: hasBirdeyeKey(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 },
    );
  }
}
