import { NextResponse } from "next/server";
import { fetchTokenByAddress } from "@/lib/dexscreener";
import {
  filterCatalogTokens,
  isEvmContractAddress,
  searchDexScreenerTokens,
} from "@/lib/token-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const chainId = searchParams.get("chainId") ?? searchParams.get("chain") ?? undefined;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (isEvmContractAddress(q) && chainId) {
      const token = await fetchTokenByAddress(chainId, q);
      if (token && token.priceUsd > 0) {
        return NextResponse.json({
          results: [
            {
              symbol: token.symbol,
              name: token.name,
              tokenAddress: token.tokenAddress,
              chainId: token.chainId,
              pairAddress: token.pairAddress,
              priceUsd: token.priceUsd,
              icon: token.icon,
            },
          ],
        });
      }
      return NextResponse.json({ results: [], error: "No pair found for this contract on selected chain" });
    }

    const remote = await searchDexScreenerTokens(q, chainId);
    return NextResponse.json({
      results: remote.map((t) => ({
        symbol: t.symbol,
        name: t.name,
        tokenAddress: t.tokenAddress,
        chainId: t.chainId,
        pairAddress: t.pairAddress,
        priceUsd: t.priceUsd,
        icon: t.icon,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { results: [], error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}

/** POST body: { q, chainId, catalog: TrendingToken[] } for local feed merge */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    q?: string;
    chainId?: string;
    catalog?: Array<{
      symbol: string;
      name: string;
      tokenAddress: string;
      chainId: string;
      pairAddress?: string;
      priceUsd?: number;
      icon?: string;
    }>;
  };

  const q = (body.q ?? "").trim();
  const chainId = body.chainId;
  if (!q) return NextResponse.json({ results: [] });

  const local = filterCatalogTokens(
    (body.catalog ?? []).map((t) => ({
      ...t,
      pairAddress: t.pairAddress ?? "",
      priceUsd: t.priceUsd ?? 0,
      change24h: 0,
      volume24h: 0,
      liquidityUsd: 0,
      url: "",
    })),
    q,
    chainId,
  );

  if (isEvmContractAddress(q) && chainId) {
    const token = await fetchTokenByAddress(chainId, q);
    if (token?.priceUsd) {
      return NextResponse.json({
        results: [
          {
            symbol: token.symbol,
            name: token.name,
            tokenAddress: token.tokenAddress,
            chainId: token.chainId,
            pairAddress: token.pairAddress,
            priceUsd: token.priceUsd,
            icon: token.icon,
          },
        ],
      });
    }
  }

  const remote = await searchDexScreenerTokens(q, chainId);
  const seen = new Set<string>();
  const merged = [];
  for (const t of [...local, ...remote]) {
    const key = `${t.chainId}:${t.tokenAddress.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      symbol: t.symbol,
      name: t.name,
      tokenAddress: t.tokenAddress,
      chainId: t.chainId,
      pairAddress: t.pairAddress,
      priceUsd: t.priceUsd,
      icon: t.icon,
    });
    if (merged.length >= 12) break;
  }

  return NextResponse.json({ results: merged });
}
