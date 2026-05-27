import { NextResponse } from "next/server";
import { fetchPortalTokenLogos } from "@/lib/coingecko";
import { mergePortalTokenLogos } from "@/lib/portal-token-logos";

export const dynamic = "force-dynamic";

export async function GET() {
  const remote = await fetchPortalTokenLogos();
  return NextResponse.json(mergePortalTokenLogos(remote));
}
