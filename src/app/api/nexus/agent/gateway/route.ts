import { NextResponse } from "next/server";
import {
  CIRCLE_AGENTS_MARKETPLACE_URL,
  X402_PRICES,
} from "@/lib/circle-agents";
import { isX402SellerConfigured } from "@/lib/x402-seller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const seller =
    process.env.X402_SELLER_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS?.trim() ||
    null;
  const facilitatorUrl =
    process.env.X402_FACILITATOR_URL?.trim() ||
    "https://gateway-api-testnet.circle.com";

  let gatewayBalance: string | null = null;
  let walletBalance: string | null = null;
  const pk = process.env.ARC_AGENT_PRIVATE_KEY?.trim();

  if (pk?.startsWith("0x")) {
    try {
      const { GatewayClient } = await import("@circle-fin/x402-batching/client");
      const client = new GatewayClient({
        chain: "arcTestnet",
        privateKey: pk as `0x${string}`,
        rpcUrl: process.env.ARC_RPC_URL ?? process.env.NEXT_PUBLIC_ARC_RPC_URL,
      });
      const balances = await Promise.race([
        client.getBalances(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("gateway_balance_timeout")), 6_000),
        ),
      ]);
      gatewayBalance = balances.gateway.formattedAvailable;
      walletBalance = balances.wallet.formatted;
    } catch {
      gatewayBalance = null;
    }
  }

  return NextResponse.json({
    marketplaceUrl: CIRCLE_AGENTS_MARKETPLACE_URL,
    sellerConfigured: isX402SellerConfigured(),
    sellerAddress: seller,
    facilitatorUrl,
    networks: process.env.X402_NETWORKS?.trim() || "eip155:5042002",
    prices: {
      alphaScan: X402_PRICES.scan,
      tokenDossier: X402_PRICES.dossier,
    },
    premiumRoutes: [
      { path: "/api/nexus/scan", price: X402_PRICES.scan, label: "Alpha desk scan" },
      { path: "/api/nexus/token/dossier", price: X402_PRICES.dossier, label: "Token dossier" },
    ],
    gatewayBalance,
    walletUsdc: walletBalance,
    agentVault: process.env.NEXT_PUBLIC_AGENT_VAULT_ADDRESS ?? null,
    note: "NEXUS UI calls use x-meridian-client: nexus (no x402). External agents pay via x402 + Circle Gateway.",
  });
}
