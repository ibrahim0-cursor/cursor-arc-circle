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
  buildPrismEngineContext,
  computeQuantForecast,
  PRISM_ENGINE_SYSTEM_PROMPT,
  type PrismEngineContext,
} from "./prism-intelligence-engine";
import { getPrismMemoryCalibration } from "./prism-forecast-memory";
import { addPrismPrediction, type PrismPrediction } from "./storage";
import { getApeWisdomMentionMap } from "./apewisdom";
import { fetchOpenNewsMacro, hasOpenNewsToken } from "./opennews-6551";

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

  return {
    probability: Math.min(100, Math.max(0, parsed.probability ?? 50)),
    confidence: Math.min(100, Math.max(0, parsed.confidence ?? 60)),
    kellyFraction: Math.min(1, Math.max(0, parsed.kellyFraction ?? 0.05)),
    horizon: parsed.horizon ?? "30 days",
    summary: parsed.summary ?? fallback.summary,
    reasoning: parsed.reasoning ?? fallback.reasoning,
    sources: parsed.sources ?? fallback.sources,
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
    topHeadlines: input.engine.scoredHeadlines.slice(0, 6).map((h) => ({
      title: h.title,
      cryptoRelevance: h.cryptoRelevance,
      impact: h.impact,
      transmission: h.transmission,
    })),
  });

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: getAiModel(),
        temperature: 0.15,
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
        max_tokens: 900,
        temperature: 0.15,
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

export async function runPrismAnalysis(input: EventInput) {
  const preset = MACRO_EVENTS.find((item) => item.id === input.eventId);
  const event = input.customEvent?.trim() || preset?.label || "Global risk-off shock in Q2";
  const category = preset?.category ?? "macro";
  const query = preset?.query ?? event;
  const eventKey = input.eventId ?? preset?.id ?? "fed-cut-june";

  const [gdelt, news, eventRegistry, community, macro, memory, apeMap, openNewsMacro] =
    await Promise.all([
      fetchGdeltArticles(query, 8),
      fetchNewsArticles(query, 6),
      fetchEventRegistryArticles(query, 6),
      fetchMacroCommunityPulse(event, query),
      buildPrismMacroSnapshot(eventKey),
      getPrismMemoryCalibration(),
      getApeWisdomMentionMap(),
      hasOpenNewsToken() ? fetchOpenNewsMacro(query, 6) : Promise.resolve([]),
    ]);

  const btcApe = apeMap.get("BTC");
  const ethApe = apeMap.get("ETH");
  if (btcApe?.mentions) {
    macro.factors.push(`BTC social rank #${btcApe.rank} · ${btcApe.mentions} mentions (ApeWisdom)`);
  }
  if (ethApe?.mentions) {
    macro.factors.push(`ETH social rank #${ethApe.rank} · ${ethApe.mentions} mentions (ApeWisdom)`);
  }
  if (openNewsMacro.length > 0) {
    community.items = [
      ...openNewsMacro.map((n) => ({
        kind: "opennews" as const,
        title: n.title,
        source: n.source,
        link: n.link,
      })),
      ...community.items,
    ].slice(0, 16);
    community.headlines = community.items.map((i) => i.title).slice(0, 8);
  }

  const engine = buildPrismEngineContext(
    event,
    category,
    query,
    macro,
    { gdelt, news, eventRegistry },
    memory.note,
  );

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
      gdelt,
      news,
      eventRegistry,
      community,
      macro,
      engine,
      scoredHeadlines: engine.scoredHeadlines,
    },
    events: MACRO_EVENTS,
  };
}

export function listPrismEvents() {
  return MACRO_EVENTS;
}
