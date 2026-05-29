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
  const newsTrustedBatches = await Promise.all(
    queries.map((q) => fetchNewsArticles(q, 6, { domains: TRUSTED_NEWS_DOMAINS })),
  );
  let newsFlat = newsTrustedBatches.flat();
  if (newsFlat.length < 3) {
    const newsBroadBatches = await Promise.all(queries.map((q) => fetchNewsArticles(q, 6)));
    newsFlat = [...newsFlat, ...newsBroadBatches.flat()];
  }
  const registryBatches = await Promise.all(queries.map((q) => fetchEventRegistryArticles(q, 5)));

  const gdelt = dedupeHeadlines(
    gdeltBatches.flat().map((a) => ({
      title: a.title,
      source: a.source,
      url: a.url,
      publishedAt: a.date,
    })),
  );
  const news = dedupeHeadlines(
    newsFlat.map((a) => ({
      title: a.title,
      source: a.source,
      url: a.url,
      publishedAt: a.publishedAt,
    })),
  );
  const eventRegistry = dedupeHeadlines(
    registryBatches.flat().map((a) => ({
      title: a.title,
      source: a.source,
      url: a.url,
      publishedAt: a.date,
    })),
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

/** 0–100 desk data quality — drives how much we trust data vs LLM narrative. */
export function computeIntelQualityScore(engine: PrismEngineContext): number {
  const h = engine.scoredHeadlines;
  if (h.length === 0) return 22;
  const trusted = h.filter((row) => sourceTrustTier(row.source) >= 2).length;
  const fresh = h.filter((row) => headlineAgeDays(row) != null && headlineAgeDays(row)! <= 3).length;
  const strongMatch = h.filter((row) => row.eventMatchPct >= 35).length;
  let score = 30 + trusted * 12 + fresh * 6 + strongMatch * 8;
  score += Math.round(engine.signalAgreement * 18);
  if (engine.scoredHeadlines.length >= 5) score += 8;
  return Math.min(95, Math.max(15, score));
}

function headlineAgeDays(item: { publishedAt?: string }): number | null {
  if (!item.publishedAt) return null;
  const t = Date.parse(item.publishedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** Blend model output with live macro/headline anchor — higher quality → more weight on data. */
export function finalizePrismProbability(
  dataProbability: number,
  modelProbability: number,
  engine: PrismEngineContext,
): number {
  const quality = computeIntelQualityScore(engine);
  const trusted = engine.scoredHeadlines.filter((h) => sourceTrustTier(h.source) >= 2).length;
  const dataWeight = quality >= 72 ? 0.82 : quality >= 50 ? 0.72 : 0.6;
  let p = Math.round(dataProbability * dataWeight + modelProbability * (1 - dataWeight));
  if (trusted >= 4 && engine.signalAgreement >= 0.5) {
    p = Math.round(p * 0.35 + dataProbability * 0.65);
  }
  const maxDelta = quality >= 60 ? 8 : 12;
  p = Math.max(dataProbability - maxDelta, Math.min(dataProbability + maxDelta, p));
  return Math.min(90, Math.max(8, p));
}

export function finalizePrismConfidence(
  baseConfidence: number,
  engine: PrismEngineContext,
  macro: PrismMacroSnapshot,
): number {
  const quality = computeIntelQualityScore(engine);
  const trusted = engine.scoredHeadlines.filter((h) => sourceTrustTier(h.source) >= 2).length;
  let c = baseConfidence;
  c += Math.round(quality * 0.12);
  c += trusted >= 3 ? 6 : 0;
  c += macro.fred ? 5 : 0;
  if (quality < 40) c = Math.min(c, 58);
  if (quality >= 75 && trusted >= 4) c = Math.min(88, c + 6);
  return Math.min(88, Math.max(34, Math.round(c)));
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
  const quality = computeIntelQualityScore(engine);
  const asOf = new Date().toISOString().slice(0, 16).replace("T", " UTC ");
  const headlines = engine.scoredHeadlines.slice(0, 6);
  const cited = headlines
    .map((h) => {
      const age = headlineAgeDays(h);
      const fresh = age != null ? (age <= 1 ? "today" : `${age}d ago`) : "recent";
      return `• [${h.source}] ${h.title.slice(0, 100)} (${h.impact}, ${h.eventMatchPct}% match, ${fresh})`;
    })
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
    `*As of ${asOf} · Intel quality ${quality}/100 (wire sources, recency, event match)*`,
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
