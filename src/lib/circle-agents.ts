/** Circle Agent Stack + x402 — NEXUS hackathon integration */

export const CIRCLE_AGENTS_MARKETPLACE_URL = "https://agents.circle.com/";
export const CIRCLE_AGENTS_DOCS_URL =
  "https://developers.circle.com/gateway/nanopayments/quickstarts/seller";

export const X402_PRICES = {
  scan: process.env.X402_SCAN_PRICE ?? "$0.05",
  dossier: process.env.X402_DOSSIER_PRICE ?? "$0.01",
} as const;

export const MERIDIAN_CLIENT_HEADER = "x-meridian-client";
export const MERIDIAN_CLIENT_VALUE = "nexus";

export function meridianClientHeaders(): Record<string, string> {
  return { [MERIDIAN_CLIENT_HEADER]: MERIDIAN_CLIENT_VALUE };
}
