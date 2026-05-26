import { NextResponse } from "next/server";
import { fetchGlobalMarket } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchGlobalMarket();
  return NextResponse.json(data ?? { error: "Market data unavailable" });
}
