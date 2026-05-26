import { NextResponse } from "next/server";
import { getTokenDecision } from "@/lib/nexus-agent";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  try {
    const decision = await getTokenDecision(chainId, address);
    await import("@/lib/storage").then((m) => m.addNexusDecision(decision));
    return NextResponse.json(decision);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token analysis failed" },
      { status: 500 },
    );
  }
}
