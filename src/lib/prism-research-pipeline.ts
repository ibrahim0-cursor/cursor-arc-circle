/**
 * PRISM autonomous research pipeline — multi-source fetch, trust scoring, data-anchored
 * probability before any LLM narrative (desk workflow stays internal).
 */

import { fetchGdeltArticles } from "./gdelt";
import { fetchNewsArticles } from "./newsapi";
import { fetchEventRegistryArticles } from "./eventregistry-client";
import type { IntelItem } from "./prism-intel-filter";
import { dedupeHeadlines, isConsumerFinanceNoise, isOffTopicForEvent, sourceTrustTier } from "./intel-headline-quality";
import type { PrismMacroSnapshot } from "./prism-macro-snapshot";
import { macroProbabilityAdjust } from "./prism-macro-snapshot";
import type { PrismEngineContext } from "./prism-intelligence-engine";
import type { PrismPrediction } from "./storage";

const TRUSTED_NEWS_DOMAINS =
  "reuters.com,bloomberg.com,ft.com,wsj.com,cnbc.com,marketwatch.com,investing.com,theguardian.com,apnews.com";

export function buildEventIntelQueries(
  event: string,
  presetId?: string,
  baseQuery?: string,
): string[] {
  const out = new Set<string>();
  if (baseQuery?.trim()) out.add(baseQuery.trim());
  const e = event.toLowerCase();

  if (presetId === "fed-cut-june" || /fed|fomc|rate cut|interest rate/i.test(e)) {
    out.add("FOMC Federal Reserve interest rate decision");
    out.add("Fed funds rate cut hold Powell");
    out.add("(Federal Reserve OR FOMC) rate decision markets");
  }
  if (presetId === "cpi-hot" || /cpi|inflation/i.test(e)) {
    out.add("US CPI inflation report consensus");
    out.add("consumer price index Fed reaction");
  }
  if (/oil|wti|crude/i.test(e)) {
    out.add("WTI crude oil price OPEC");
  }
  if (/middle east|geopolit|iran|israel/i.test(e)) {
    out.add("Middle East conflict oil markets");
  }
  if (/bitcoin|btc|\$100/i.test(e)) {
    out.add("Bitcoin BTC price institutional");
  }

  if (out.size === 0) out.add(event.slice(0, 120));
  return [...out].slice(0, 4);
}

export async function fetchExpandedEventIntel(queries: string[]): Promise<{
  gdelt: IntelItem[];
  news: IntelItem[];
  eventRegistry: IntelItem[];
}> {
  const gdeltBatches = await Promise.all(queries.map((q) => fetchGdeltArticles(q, 8)));
  const newsBatches = await Promise.all(
    queries.map((q) => fetchNewsArticles(q, 6, { domains: TRUSTED_NEWS_DOMAINS })),
  );
  const registryBatches = await Promise.all(queries.map((q) => fetchEventRegistryArticles(q, 5)));

  const gdelt = dedupeHeadlines(
    gdeltBatches.flat().map((a) => ({ title: a.title, source: a.source, url: a.url })),
  );
  const news = dedupeHeadlines(
    newsBatches.flat().map((a) => ({ title: a.title, source: a.source, url: a.url })),
  );
  const eventRegistry = dedupeHeadlines(
    registryBatches.flat().map((a) => ({ title: a.title, source: a.source, url: a.url })),
  );

  return { gdelt, news, eventRegistry };
}

/** Data-first probability anchor — LLM must stay within band unless strong headline consensus. */
export function computeDataAnchoredProbability(
  event: string,
  category: PrismPrediction["category"],
  macro: PrismMacroSnapshot,
  engine: PrismEngineContext,
): number {
  const bullish = engine.scoredHeadlines.filter((h) => h.impact === "bullish").length;
  const bearish = engine.scoredHeadlines.filter(
    (h) => h.impact === "bearish" || h.impact === "uncertainty",
  ).length;

  let base = category === "geopolitical" ? 36 : category === "macro" ? 44 : 50;

  if (/fed|fomc|rate cut/i.test(event)) {
    base = 42;
    const t = engine.scoredHeadlines.map((h) => h.title.toLowerCase()).join(" ");
    if (/rate cut|cuts rates|dovish|easing/i.test(t)) base += 8;
    if (/hold rates|pause|hike|hawkish|higher for longer/i.test(t)) base -= 12;
    if (macro.fred?.seriesId === "DFF") {
      if (macro.fred.changePct != null && macro.fred.changePct < 0) base += 7;
      if (macro.fred.changePct != null && macro.fred.changePct > 0) base -= 6;
      const level = macro.fred.latest.value;
      if (level > 4.5) base -= 4;
      if (level < 3) base += 5;
    }
  }

  if (bullish > bearish + 1) base += 8;
  if (bearish > bullish + 1) base -= 8;

  const trusted = engine.scoredHeadlines.filter((h) => sourceTrustTier(h.source) >= 2).length;
  if (trusted >= 2) base += 4;
  if (engine.scoredHeadlines.length < 2) base = Math.min(base, 48);

  return macroProbabilityAdjust(base, category, macro);
}

export function formatPublicSummary(
  event: string,
  probability: number,
  engine: PrismEngineContext,
  macro: PrismMacroSnapshot,
): string {
  const anchor = macro.fred?.label ? ` Anchored on ${macro.fred.label} (${macro.fred.latest.value}${macro.fred.unit ? ` ${macro.fred.unit}` : ""}, FRED).` : "";
  const regime = engine.regime.replace(/-/g, " ");
  return `${probability}% probability for “${event}” in a ${regime} regime.${anchor} ${engine.sectorImpact.split(";")[0]}.`;
}

/** Journalist-facing reasoning — no internal filter notes, no duplicate blocks. */
export function formatPublicAgentReasoning(
  event: string,
  engine: PrismEngineContext,
  macro: PrismMacroSnapshot,
  core: Pick<PrismPrediction, "probability" | "confidence" | "reasoning" | "sources">,
): string {
  const headlines = engine.scoredHeadlines.slice(0, 5);
  const cited = headlines
    .map((h) => `• [${h.source}] ${h.title.slice(0, 100)} (${h.impact}, ${h.eventMatchPct}% match)`)
    .join("\n");

  const bullish = headlines.filter((h) => h.impact === "bullish").length;
  const bearish = headlines.filter(
    (h) => h.impact === "bearish" || h.impact === "uncertainty",
  ).length;

  const macroBlock = macro.factors.slice(0, 4).map((f) => `• ${f}`).join("\n");
  const transmission = engine.transmissionChain.join(" → ");
  const inv = engine.invalidation.replace(/^Invalidation:\s*/i, "");

  const llm = core.reasoning
    .replace(/Desk review for[^.]*\.\s*/i, "")
    .replace(/Source triage:[^.]*\.\s*/gi, "")
    .replace(/Transmission:[^.]*\.\s*/gi, "")
    .replace(/Invalidation:[^.]*\.\s*/gi, "")
    .trim();

  return [
    `## Research brief: ${event}`,
    "",
    "### 1. Verified headline scan",
    headlines.length > 0
      ? `${headlines.length} on-topic sources (${bullish} supportive / ${bearish} cautious). Signal agreement ${Math.round(engine.signalAgreement * 100)}%.`
      : "Limited on-topic headlines — forecast leans on live macro data.",
    cited || "• No passing headlines after trust and relevance filters.",
    "",
    "### 2. Live macro cross-check",
    macroBlock || "• Macro feeds unavailable — widen uncertainty.",
    "",
    "### 3. Transmission to crypto",
    transmission,
    engine.regimeDetail,
    "",
    "### 4. Probability thesis",
    `Desk assigns **${core.probability}%** probability with **${core.confidence}%** confidence (${engine.regime}).`,
    llm.length > 80 ? llm : "",
    "",
    "### 5. What would change our view",
    inv,
    core.sources.length > 0 ? `\nSources: ${core.sources.slice(0, 5).join(" · ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function applyTrustBoostSort<T extends { source: string; title: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => sourceTrustTier(b.source) - sourceTrustTier(a.source));
}

export function filterResearchIntel(
  items: IntelItem[],
  event: string,
  category: PrismPrediction["category"],
): IntelItem[] {
  return items.filter((item) => {
    if (isConsumerFinanceNoise(item.title)) return false;
    if (isOffTopicForEvent(item.title, event, category)) return false;
    if (category === "macro" && sourceTrustTier(item.source) === 0) return false;
    return true;
  });
}
