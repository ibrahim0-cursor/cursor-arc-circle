/**
 * Merge GMGN OpenAPI reads into NEXUS token intel / security (API key only).
 */

import {
  dexChainIdToGmgn,
  fetchGmgnTokenScanBundle,
  gmgnKolHolders,
  gmgnTokenOverview,
} from "./gmgn-analytics";
import { hasGmgnApiKey } from "./gmgn-client";
import type { TokenIntel } from "./storage";
import type { TokenSecurityReport } from "./token-security";

type GmgnSecurityPayload = {
  is_honeypot?: string;
  owner_renounced?: string;
  renounced_mint?: boolean;
  renounced_freeze_account?: boolean;
  buy_tax?: number | string;
  sell_tax?: number | string;
  rug_ratio?: number;
  top_10_holder_rate?: number;
  flags?: string[];
};

export type GmgnEnrichment = {
  gmgnTrending?: boolean;
  gmgnSmartMoneyHolders?: number;
  gmgnKolHolders?: number;
  lines: string[];
};

export async function enrichTokenIntelWithGmgn(
  chainId: string,
  tokenAddress: string,
  intel: TokenIntel,
): Promise<{
  intel: TokenIntel;
  enrichment: GmgnEnrichment | null;
  gmgnSecurity?: unknown;
}> {
  if (!hasGmgnApiKey()) return { intel, enrichment: null, gmgnSecurity: undefined };

  const gmgnChain = dexChainIdToGmgn(chainId);
  if (!gmgnChain) return { intel, enrichment: null, gmgnSecurity: undefined };

  const [bundle, overview, kol] = await Promise.all([
    fetchGmgnTokenScanBundle(gmgnChain, tokenAddress),
    gmgnTokenOverview(gmgnChain, tokenAddress),
    gmgnKolHolders(gmgnChain, tokenAddress, 10),
  ]);
  const lines: string[] = [];
  let next = { ...intel };

  const infoStat = overview.ok
    ? (overview.data as { smart_degen_count?: number; renowned_count?: number; top_10_holder_rate?: number })
    : null;
  if (infoStat?.renowned_count != null && infoStat.renowned_count > 0) {
    lines.push(`GMGN KOL holders: ${infoStat.renowned_count}`);
  }
  if (infoStat?.smart_degen_count != null && infoStat.smart_degen_count > 0) {
    lines.push(`GMGN smart money count: ${infoStat.smart_degen_count}`);
  }

  const kolList = kol.ok ? (kol.data as { list?: unknown[] })?.list : null;
  if (Array.isArray(kolList) && kolList.length > 0) {
    lines.push(`GMGN KOL wallets tagged: ${kolList.length}`);
  }

  if (bundle.trendingMatch) {
    lines.push(
      `GMGN trending (${bundle.trendingMatch.chain}) · vol $${Math.round(bundle.trendingMatch.volume24h).toLocaleString()}`,
    );
  }

  const sec = bundle.security?.ok ? (bundle.security.data as GmgnSecurityPayload) : null;
  if (sec) {
    if (sec.top_10_holder_rate != null) {
      next = { ...next, top10HolderPercent: Number(sec.top_10_holder_rate) * 100 };
    }
    if (sec.is_honeypot === "yes") {
      lines.push("GMGN: honeypot flagged");
    }
    if (sec.rug_ratio != null && sec.rug_ratio > 0.3) {
      lines.push(`GMGN rug_ratio ${(sec.rug_ratio * 100).toFixed(0)}%`);
    }
  }

  const holders = bundle.smartMoneyHolders?.ok
    ? (bundle.smartMoneyHolders.data as { list?: unknown[] })
    : null;
  const holderList = Array.isArray(holders?.list) ? holders.list : [];
  const smartCount = holderList.length;

  if (smartCount > 0) {
    lines.push(`GMGN smart money: ${smartCount} tagged holders`);
  }

  const enrichment: GmgnEnrichment = {
    gmgnTrending: Boolean(bundle.trendingMatch),
    gmgnSmartMoneyHolders: smartCount,
    lines,
  };

  return {
    intel: next,
    enrichment: lines.length > 0 ? enrichment : null,
    gmgnSecurity: bundle.security?.ok ? bundle.security.data : undefined,
  };
}

export function mergeGmgnIntoSecurityReport(
  report: TokenSecurityReport,
  gmgnSecurity: unknown,
): TokenSecurityReport {
  const sec = gmgnSecurity as GmgnSecurityPayload | null;
  if (!sec || typeof sec !== "object") return report;

  const flags = [...report.flags];
  let score = report.score;
  let honeypotRisk = report.honeypotRisk;

  if (sec.is_honeypot === "yes") {
    honeypotRisk = true;
    score = Math.min(score, 15);
    flags.push("GMGN honeypot");
  }
  if (sec.owner_renounced === "no") {
    score -= 12;
    flags.push("GMGN: ownership not renounced");
  }
  if (sec.renounced_mint === false) {
    score -= 10;
    flags.push("GMGN: mint not renounced");
  }
  if (sec.renounced_freeze_account === false) {
    score -= 10;
    flags.push("GMGN: freeze not renounced");
  }
  const rug = Number(sec.rug_ratio ?? 0);
  if (rug > 0.35) {
    score -= 15;
    flags.push(`GMGN rug_ratio ${(rug * 100).toFixed(0)}%`);
  }

  const grade =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";

  return {
    ...report,
    score: Math.max(0, Math.min(100, score)),
    grade,
    honeypotRisk,
    flags: [...new Set(flags)].slice(0, 10),
    label: honeypotRisk ? "GMGN honeypot risk" : report.label,
  };
}

export function gmgnEnrichmentLines(enrichment: GmgnEnrichment | null): string | undefined {
  if (!enrichment?.lines.length) return undefined;
  return enrichment.lines.join(" · ");
}
