/**
 * Merge GoPlus + honeypot.is into desk security reports (free APIs).
 */

import type { TrendingToken } from "./dexscreener";
import type { TokenIntel } from "./storage";
import { fetchGoPlusTokenSecurity } from "./goplus-security";
import { fetchHoneypotIsCheck } from "./honeypot-check";
import { scoreTokenSecurity, type TokenSecurityReport } from "./token-security";

export async function fetchExternalTokenSecurity(
  token: TrendingToken,
  intel?: TokenIntel,
): Promise<TokenSecurityReport> {
  let report = scoreTokenSecurity(token, intel);

  const [goplus, honeypot] = await Promise.all([
    fetchGoPlusTokenSecurity(token.chainId, token.tokenAddress),
    fetchHoneypotIsCheck(token.chainId, token.tokenAddress),
  ]);

  const flags = [...report.flags];

  if (goplus.ok) {
    if (goplus.isHoneypot) {
      report.honeypotRisk = true;
      report.score = Math.min(report.score, 25);
      flags.push(...goplus.flags.filter((f) => f.includes("honeypot")));
    }
    if (goplus.isMintable) {
      report.score -= 12;
      flags.push("GoPlus: mintable");
    }
    if ((goplus.buyTax ?? 0) > 8 || (goplus.sellTax ?? 0) > 8) {
      report.score -= 15;
      flags.push(`High tax ${goplus.buyTax ?? 0}%/${goplus.sellTax ?? 0}%`);
    }
    if ((goplus.top10HolderPercent ?? 0) > 65) {
      report.score -= 10;
      flags.push(`Top 10 concentration ${goplus.top10HolderPercent?.toFixed(0)}%`);
    }
    flags.push(...goplus.flags.filter((f) => !flags.includes(f)));
  }

  if (honeypot.ok && honeypot.isHoneypot) {
    report.honeypotRisk = true;
    report.score = Math.min(report.score, 20);
    flags.push(...honeypot.flags);
  } else if (honeypot.flags.length) {
    flags.push(...honeypot.flags);
  }

  report.score = Math.max(0, Math.min(100, report.score));
  report.flags = [...new Set(flags)].slice(0, 8);

  const grade: TokenSecurityReport["grade"] =
    report.score >= 80 ? "A" : report.score >= 65 ? "B" : report.score >= 50 ? "C" : report.score >= 35 ? "D" : "F";

  report.grade = grade;
  report.label = report.honeypotRisk
    ? "High risk — honeypot (GoPlus/honeypot.is)"
    : grade === "A" || grade === "B"
      ? "Security OK (GoPlus checked)"
      : grade === "C"
        ? "Caution — review taxes & holders"
        : "Risky token";

  return report;
}
