import Anthropic from "@anthropic-ai/sdk";
import { getAiClient, getAiModel } from "./ai-client";
import { randomUUID } from "crypto";
import { fetchMacroCommunityPulse } from "./community-pulse";
import { MACRO_EVENTS } from "./gdelt";
import { buildPrismMacroSnapshot, type PrismMacroSnapshot } from "./prism-macro-snapshot";
import { anchorDecisionPayload } from "./arc";
import { calibratePrismForecast } from "./prism-calibration";
import {
  buildDeskResearchBrief,
  buildPrismEngineContext,
  computeQuantForecast,
  PRISM_ENGINE_SYSTEM_PROMPT,
  type PrismEngineContext,
} from "./prism-intelligence-engine";
import { getPrismMemoryCalibration } from "./prism-forecast-memory";
import { addPrismPrediction, type PrismPrediction } from "./storage";
import { getApeWisdomMentionMap } from "./apewisdom";
import { fetchOpenNewsMacroWithStatus, hasOpenNewsToken, type OpenNewsItem } from "./opennews-6551";
import {
  buildIntelStatus,
  extractEventKeywords,
  mergeIntelSources,
  type PrismIntelStatus,
} from "./prism-intel-filter";
import {
  buildEventIntelQueries,
  computeDataAnchoredProbability,
  computeIntelQualityScore,
  fetchExpandedEventIntel,
  filterResearchIntel,
  finalizePrismConfidence,
  finalizePrismProbability,
  formatPublicAgentReasoning,
  formatPublicSummary,
} from "./prism-research-pipeline";

type EventInput = {
  eventId?: string;
  customEvent?: string;
  arcFeeTxHash?: string;
};

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function parsePrismJson(raw: string, fallback: ReturnType<typeof computeQuantForecast>) {
  const parsed = JSON.parse(raw) as {
    probability?: number;
    confidence?: number;
    kellyFraction?: number;
    horizon?: string;
    summary?: string;
    reasoning?: string;
    sources?: string[];
  };

  let reasoning = (parsed.reasoning ?? fallback.reasoning).trim();
  const thin =
    reasoning.length < 160 ||
    (!/\[/.test(reasoning) && fallback.sources.some((s) => s.includes(":")));
  if (thin && fallback.reasoning) {
    reasoning = `${fallback.reasoning.split(" Transmission:")[0] ?? fallback.reasoning} ${reasoning}`.trim();
  }

  const prob = parsed.probability ?? fallback.probability;
  const anchored = Math.min(
    92,
    Math.max(8, Math.round((prob + fallback.probability) / 2)),
  );

  return {
    probability: anchored,
    confidence: Math.min(100, Math.max(0, parsed.confidence ?? 60)),
    kellyFraction: Math.min(1, Math.max(0, parsed.kellyFraction ?? 0.05)),
    horizon: parsed.horizon ?? "30 days",
    summary: parsed.summary ?? fallback.summary,
    reasoning,
    sources:
      parsed.sources && parsed.sources.length >= 2 ? parsed.sources : fallback.sources,
  };
}

async function aiPrediction(input: {
  event: string;
  category: PrismPrediction["category"];
  engine: PrismEngineContext;
  macro: PrismMacroSnapshot;
  dataProbability: number;
}) {
  const anthropic = getAnthropic();
  const openai = getAiClient();

  const fallback = computeQuantForecast(input.event, input.category, input.engine, input.macro);
  const deskBrief = buildDeskResearchBrief(input.event, input.engine, input.macro);

  const payload = JSON.stringify({
    event: input.event,
    category: input.category,
    regime: input.engine.regime,
    regimeDetail: input.engine.regimeDetail,
    signalAgreement: input.engine.signalAgreement,
    dataAnchoredProbability: input.dataProbability,
    weights: input.engine.weights,
    transmissionChain: input.engine.transmissionChain,
    sectorImpact: input.engine.sectorImpact,
    invalidation: input.engine.invalidation,
    macroFactors: input.macro.factors,
    macro: {
      market: input.macro.market,
      defi: input.macro.defi,
      fred: input.macro.fred,
      dune: input.macro.dune,
    },
    deskResearchBrief: deskBrief,
    topHeadlines: input.engine.scoredHeadlines.slice(0, 12).map((h) => ({
      title: h.title,
      source: h.source,
      url: h.url,
      cryptoRelevance: h.cryptoRelevance,
      eventMatchPct: h.eventMatchPct,
      impact: h.impact,
      newsClass: h.newsClass,
      transmission: h.transmission,
    })),
    headlineCount: input.engine.scoredHeadlines.length,
    intelQuality: computeIntelQualityScore(input.engine),
    asOfUtc: new Date().toISOString(),
    instruction:
      "Institutional desk: use only topHeadlines + macroFactors. Probability within ±8 of dataAnchoredProbability when intelQuality≥70. Cite ≥3 [source] headlines with dates. No BUY/SELL/HOLD.",
  });

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: getAiModel(),
        temperature: 0.12,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PRISM_ENGINE_SYSTEM_PROMPT },
          { role: "user", content: payload },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parsePrismJson(raw, fallback);
      return { event: input.event, category: input.category, ...parsed };
    } catch (error) {
      console.warn("OpenAI unavailable for PRISM:", error);
    }
  }

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 1400,
        temperature: 0.12,
        system: PRISM_ENGINE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: payload }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const raw = textBlock?.type === "text" ? textBlock.text : "{}";
      const parsed = parsePrismJson(raw, fallback);
      return { event: input.event, category: input.category, ...parsed };
    } catch (error) {
      console.warn("Anthropic unavailable for PRISM:", error);
    }
  }

  return fallback;
}

function inferEventCategory(event: string): PrismPrediction["category"] {
  if (/war|sanction|conflict|missile|geopolit|tariff|strike|military/i.test(event)) return "geopolitical";
  if (/btc|bitcoin|eth|ethereum|crypto|defi|token|solana|memecoin/i.test(event)) return "markets";
  return "macro";
}

function buildSearchQuery(event: string, presetQuery?: string): string {
  if (presetQuery) return presetQuery;
  const keywords = extractEventKeywords(event);
  return keywords.length >= 2 ? keywords.slice(0, 6).join(" ") : event;
}

export async function runPrismAnalysis(input: EventInput) {
  const preset = MACRO_EVENTS.find((item) => item.id === input.eventId);
  const event = input.customEvent?.trim() || preset?.label || "Global risk-off shock in Q2";
  const category = preset?.category ?? inferEventCategory(event);
  const query = buildSearchQuery(event, preset?.query);
  const eventKey = input.eventId ?? preset?.id ?? "fed-cut-june";

  const keywordQuery = extractEventKeywords(event, query).slice(0, 5).join(" ");
  const intelQueries = buildEventIntelQueries(event, eventKey, query);

  const [expandedIntel, community, macro, memory, apeMap, openNewsResult] = await Promise.all([
    fetchExpandedEventIntel(intelQueries),
    fetchMacroCommunityPulse(event, query),
    buildPrismMacroSnapshot(eventKey),
    getPrismMemoryCalibration(),
    getApeWisdomMentionMap(),
    hasOpenNewsToken()
      ? fetchOpenNewsMacroWithStatus(keywordQuery || query, 10)
      : Promise.resolve({ items: [] as OpenNewsItem[], quotaExhausted: false }),
  ]);

  const openNewsMacro = openNewsResult.items;
  const gdelt = filterResearchIntel(expandedIntel.gdelt, event, category);
  const news = filterResearchIntel(expandedIntel.news, event, category);
  const eventRegistry = filterResearchIntel(expandedIntel.eventRegistry, event, category);
  const mergedGdelt = gdelt.slice(0, 20);

  const btcApe = apeMap.get("BTC");
  const ethApe = apeMap.get("ETH");
  if (btcApe?.mentions) {
    macro.factors.push(`BTC social rank #${btcApe.rank} · ${btcApe.mentions} mentions (ApeWisdom)`);
  }
  if (ethApe?.mentions) {
    macro.factors.push(`ETH social rank #${ethApe.rank} · ${ethApe.mentions} mentions (ApeWisdom)`);
  }

  const intelPool = mergeIntelSources({
    gdelt: mergedGdelt,
    news,
    eventRegistry,
    openNews: openNewsMacro,
    community: community.items,
  });

  const engine = buildPrismEngineContext(
    event,
    category,
    query,
    macro,
    {
      gdelt: mergedGdelt,
      news,
      eventRegistry,
      openNews: openNewsMacro,
      community: community.items,
    },
    memory.note,
  );

  const intelStatus: PrismIntelStatus = buildIntelStatus(intelPool.length, engine.scoredHeadlines.length, {
    openNewsQuotaExhausted: openNewsResult.quotaExhausted,
    gdeltCount: mergedGdelt.length,
    newsApiCount: news.length,
  });

  const dataProbability = computeDataAnchoredProbability(event, category, macro, engine);
  const raw = await aiPrediction({ event, category, engine, macro, dataProbability });
  const calibrated = calibratePrismForecast(raw, macro, engine, memory.maxAllowedConfidence);
  const probability = finalizePrismProbability(
    dataProbability,
    calibrated.probability,
    engine,
  );
  const confidence = finalizePrismConfidence(calibrated.confidence, engine, macro);
  const merged = { ...calibrated, probability, confidence };
  const core = {
    ...merged,
    summary: formatPublicSummary(event, probability, engine, macro),
    reasoning: formatPublicAgentReasoning(event, engine, macro, merged),
  };

  const payload = JSON.stringify({
    product: "PRISM",
    regime: engine.regime,
    ...core,
    at: new Date().toISOString(),
  });
  const anchor = await anchorDecisionPayload(payload);

  const prediction: PrismPrediction = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...core,
    arcTxHash: input.arcFeeTxHash ?? anchor.txHash,
  };

  await addPrismPrediction(prediction);

  return {
    prediction,
    intelligence: {
      gdelt: mergedGdelt,
      news,
      eventRegistry,
      community,
      macro,
      engine,
      scoredHeadlines: engine.scoredHeadlines,
      intelStatus,
    },
    events: MACRO_EVENTS,
  };
}

export function listPrismEvents() {
  return MACRO_EVENTS;
}
