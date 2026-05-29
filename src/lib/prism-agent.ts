import Anthropic from "@anthropic-ai/sdk";
import { getAiClient, getAiModel } from "./ai-client";
import { randomUUID } from "crypto";
import { fetchMacroCommunityPulse } from "./community-pulse";
import { fetchGdeltArticles, MACRO_EVENTS } from "./gdelt";
import { fetchNewsArticles } from "./newsapi";
import { fetchEventRegistryArticles } from "./eventregistry-client";
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

  return {
    probability: Math.min(100, Math.max(0, parsed.probability ?? 50)),
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
}) {
  const anthropic = getAnthropic();
  const openai = getAiClient();

  const fallback = computeQuantForecast(input.event, input.category, input.engine, input.macro);

  const payload = JSON.stringify({
    event: input.event,
    category: input.category,
    regime: input.engine.regime,
    regimeDetail: input.engine.regimeDetail,
    signalAgreement: input.engine.signalAgreement,
    weights: input.engine.weights,
    transmissionChain: input.engine.transmissionChain,
    sectorImpact: input.engine.sectorImpact,
    invalidation: input.engine.invalidation,
    weakCausalityRejected: input.engine.weakCausalityRejected,
    macroFactors: input.macro.factors,
    macro: {
      market: input.macro.market,
      defi: input.macro.defi,
      fred: input.macro.fred,
      dune: input.macro.dune,
    },
    topHeadlines: input.engine.scoredHeadlines.slice(0, 8).map((h) => ({
      title: h.title,
      source: h.source,
      cryptoRelevance: h.cryptoRelevance,
      eventMatchPct: h.eventMatchPct,
      impact: h.impact,
      transmission: h.transmission,
    })),
    headlineCount: input.engine.scoredHeadlines.length,
    instruction:
      "Use topHeadlines as primary intel — cite 2+ by source in reasoning. Reject sensational single-source items.",
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

  const [gdelt, news, eventRegistry, community, macro, memory, apeMap, openNewsResult, gdeltFallback] =
    await Promise.all([
      fetchGdeltArticles(query, 10),
      fetchNewsArticles(query, 8),
      fetchEventRegistryArticles(query, 8),
      fetchMacroCommunityPulse(event, query),
      buildPrismMacroSnapshot(eventKey),
      getPrismMemoryCalibration(),
      getApeWisdomMentionMap(),
      hasOpenNewsToken()
        ? fetchOpenNewsMacroWithStatus(keywordQuery || query, 10)
        : Promise.resolve({ items: [] as OpenNewsItem[], quotaExhausted: false }),
      input.customEvent?.trim() && keywordQuery !== query
        ? fetchGdeltArticles(keywordQuery, 6)
        : Promise.resolve([]),
    ]);

  const openNewsMacro = openNewsResult.items;
  const mergedGdelt = [...gdelt, ...gdeltFallback].slice(0, 14);

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

  const raw = await aiPrediction({ event, category, engine, macro });
  const core = calibratePrismForecast(raw, macro, engine, memory.maxAllowedConfidence);

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
