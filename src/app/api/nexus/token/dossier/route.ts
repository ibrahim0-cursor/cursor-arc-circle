import { NextResponse } from "next/server";
import { X402_PRICES } from "@/lib/circle-agents";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import { withX402Guard } from "@/lib/x402-seller";
import { buildResearchReport } from "@/lib/nexus-research";
import { buildTokenDossierPayload } from "@/lib/nexus-research-dossier";
import { buildDeskAgentSignal } from "@/lib/nexus-agent";
import { buildDeepTokenIntel } from "@/lib/deep-token-analysis";
import { fetchMergedTokenDetection } from "@/lib/token-detection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  return withX402Guard(
    request,
    {
      price: X402_PRICES.dossier,
      resourcePath: "/api/nexus/token/dossier",
      description: "NEXUS token dossier — holders, traders, TA, agent reasoning",
    },
    () => handleTokenDossier(request),
  );
}

async function handleTokenDossier(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");
  const address = searchParams.get("address");
  const buys = Number(searchParams.get("buys") ?? 0);
  const sells = Number(searchParams.get("sells") ?? 0);
  const volume = Number(searchParams.get("volume") ?? 0);
  const tier = searchParams.get("tier") === "alpha" ? "alpha" : "feed";

  if (!chainId || !address) {
    return NextResponse.json({ error: "chainId and address required" }, { status: 400 });
  }

  try {
    const loaded = await fetchTokenByAddress(chainId, address);
    const token = loaded ?? {
      symbol: searchParams.get("symbol") ?? "???",
      name: searchParams.get("name") ?? "Token",
      tokenAddress: address,
      chainId,
      pairAddress: searchParams.get("pair") ?? "",
      priceUsd: Number(searchParams.get("price") ?? 0),
      change24h: Number(searchParams.get("change24h") ?? 0),
      volume24h: volume,
      liquidityUsd: Number(searchParams.get("liquidity") ?? 0),
      url: `https://dexscreener.com/${chainId}/${address}`,
      txns24h: { buys, sells },
    };

    const dexStats = {
      buys: token.txns24h?.buys ?? buys,
      sells: token.txns24h?.sells ?? sells,
      volume: token.volume24h ?? volume,
    };

    const scanKind = tier === "alpha" ? "alpha" : "feed";
    const [bundle, detection] = await Promise.all([
      buildDeepTokenIntel(token, {
        scanKind,
        tokenIndex: 0,
        skipGmgnEnrich: false,
      }),
      fetchMergedTokenDetection(token.tokenAddress, token.chainId, dexStats),
    ]);

    const agent = await buildDeskAgentSignal(token, bundle.intel);
    const research = buildResearchReport({
      token,
      agent,
      intel: bundle.intel,
      technical: bundle.intel.technical,
      news: bundle.news,
      social: bundle.social,
    });

    const payload = await buildTokenDossierPayload(token, {
      tier,
      intel: bundle.intel,
      agent,
      community: bundle.community,
      news: bundle.news,
      research,
      detection,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dossier failed" },
      { status: 500 },
    );
  }
}
