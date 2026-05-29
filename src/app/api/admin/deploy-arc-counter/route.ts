import { NextResponse } from "next/server";
import { deployArcCounterContract } from "@/lib/deploy-arc-counter";
import { arcExplorerAddress, arcExplorerTx } from "@/lib/arc-chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function authorize(request: Request): boolean {
  const expected =
    process.env.ARC_DEPLOY_SECRET?.trim() ??
    process.env.SUPABASE_SETUP_SECRET?.trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-arc-deploy-key")?.trim();
  return auth === expected || header === expected;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Set ARC_DEPLOY_SECRET on Vercel, then POST with header x-arc-deploy-key",
      },
      { status: 401 },
    );
  }

  try {
    const result = await deployArcCounterContract();
    return NextResponse.json({
      ok: true,
      deployer: result.deployer,
      contractAddress: result.contractAddress,
      txHash: result.txHash,
      explorer: {
        contract: arcExplorerAddress(result.contractAddress),
        tx:
          result.txHash !== "already-configured"
            ? arcExplorerTx(result.txHash)
            : undefined,
      },
      vercelEnv: `NEXT_PUBLIC_ARC_COUNTER_ADDRESS=${result.contractAddress}`,
      note:
        result.txHash === "already-configured"
          ? "Counter address already in env"
          : "Add NEXT_PUBLIC_ARC_COUNTER_ADDRESS to Vercel Production and redeploy",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Deploy failed",
        hint: "Ensure ARC_AGENT_PRIVATE_KEY is set and wallet has Arc Testnet USDC",
      },
      { status: 500 },
    );
  }
}
