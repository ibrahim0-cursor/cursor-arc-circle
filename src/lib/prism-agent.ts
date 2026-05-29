import Anthropic from "@anthropic-ai/sdk";
import { getAiClient, getAiModel } from "./ai-client";
import { randomUUID } from "crypto";
import { fetchMacroCommunityPulse } from "./community-pulse";
import { fetchGdeltArticles, MACRO_EVENTS } from "./gdelt";
import { fetchNewsArticles } from "./newsapi";
import { fetchEventRegistryArticles } from "./eventregistry-client";
import {
  buildPrismMacroSnapshot,
  macroProbabilityAdjust,
  type PrismMacroSnapshot,
} from "./prism-macro-snapshot";
import { anchorDecisionPayload } from "./arc";
import { calibratePrismForecast } from "./prism-calibration";
import { addPrismPrediction, type PrismPrediction } from "./storage";

type EventInput = {
  eventId?: string;
  customEvent?: string;
};

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

function heuristicPrediction(input: {
  event: string;
  category: PrismPrediction["category"];
  headlines: string[];
  macro: PrismMacroSnapshot;
}): Omit<PrismPrediction, "id" | "timestamp" | "arcTxHash"> {
  const toneBoost = input.headlines.length > 4 ? 8 : 0;
  const base =
    input.category === "geopolitical" ? 42 : input.category === "macro" ? 48 : 55;
  const probability = macroProbabilityAdjust(base + toneBoost, input.category, input.macro);

  const macroLine =
    input.macro.factors.length > 0
      ? input.macro.factors.slice(0, 3).join("; ")
      : "Limited quantitative macro feeds";

  return {
    event: input.event,
    category: input.category,
    probability,
    confidence: input.macro.fred ? 68 : input.macro.market ? 65 : 58,
    kellyFraction: 0.08,
    horizon: "14 days",
    summary: `PRISM calibrated "${input.event}" using live market, DeFi, and headline signals.`,
    reasoning: `${macroLine}. Narrative scan across GDELT, news wires, and structured feeds; probability adjusted for current risk regime.`,
    sources: [...input.macro.factors.slice(0, 2), ...input.headlines.slice(0, 3)],
  };
}


function parsePrismJson(raw: string, fallback: ReturnType<typeof heuristicPrediction>) {
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
  gdelt: Awaited<ReturnType<typeof fetchGdeltArticles>>;
  news: Awaited<ReturnType<typeof fetchNewsArticles>>;
  eventRegistry: Awaited<ReturnType<typeof fetchEventRegistryArticles>>;
  communityHeadlines: string[];
  macro: PrismMacroSnapshot;
}) {
  const anthropic = getAnthropic();
  const openai = getAiClient();
  const headlines = [
    ...input.gdelt.map((item) => item.title),
    ...input.news.map((item) => item.title),
    ...input.eventRegistry.map((item) => item.title),
    ...input.communityHeadlines,
  ];

  const fallback = heuristicPrediction({
    event: input.event,
    category: input.category,
    headlines,
    macro: input.macro,
  });

  const payload = JSON.stringify({
    event: input.event,
    category: input.category,
    macroFactors: input.macro.factors,
    macro: {
      market: input.macro.market,
      defi: input.macro.defi
        ? {
            totalTvlUsd: input.macro.defi.totalTvlUsd,
            change7dPct: input.macro.defi.change7dPct,
          }
        : null,
      fred: input.macro.fred,
      dune: input.macro.dune,
    },
    gdelt: input.gdelt.slice(0, 6),
    news: input.news.slice(0, 6),
    eventRegistry: input.eventRegistry.slice(0, 6),
    community: input.communityHeadlines.slice(0, 8),
  });

  const systemPrompt =
    "You are PRISM, a macro and geopolitical forecasting agent. Use macroFactors (Binance spot, CoinGecko cap, DefiLlama TVL, FRED series) as primary quantitative evidence; headlines are secondary. Return strict JSON with keys: probability (0-100), confidence (0-100), kellyFraction (0-1), horizon (string), summary (1 sentence), reasoning (2 sentences citing numbers when available), sources (array of short strings).";

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: getAiModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: payload },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = parsePrismJson(raw, fallback);

      return {
        event: input.event,
        category: input.category,
        ...parsed,
      };
    } catch (error) {
      console.warn("OpenAI unavailable for PRISM, trying Anthropic/heuristic:", error);
    }
  }

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 800,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: payload }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const raw = textBlock?.type === "text" ? textBlock.text : "{}";
      const parsed = parsePrismJson(raw, fallback);

      return {
        event: input.event,
        category: input.category,
        ...parsed,
      };
    } catch (error) {
      console.warn("Anthropic unavailable, falling back:", error);
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

  const [gdelt, news, eventRegistry, community, macro] = await Promise.all([
    fetchGdeltArticles(query, 8),
    fetchNewsArticles(query, 6),
    fetchEventRegistryArticles(query, 6),
    fetchMacroCommunityPulse(event, query),
    buildPrismMacroSnapshot(eventKey),
  ]);

  const headlineCount =
    gdelt.length + news.length + eventRegistry.length + community.headlines.length;

  const raw = await aiPrediction({
    event,
    category,
    gdelt,
    news,
    eventRegistry,
    communityHeadlines: community.headlines,
    macro,
  });

  const core = calibratePrismForecast(raw, macro, headlineCount);
  const payload = JSON.stringify({ product: "PRISM", ...core, at: new Date().toISOString() });
  const anchor = await anchorDecisionPayload(payload);

  const prediction: PrismPrediction = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...core,
    arcTxHash: anchor.txHash,
  };

  await addPrismPrediction(prediction);

  return {
    prediction,
    intelligence: { gdelt, news, eventRegistry, community, macro },
    events: MACRO_EVENTS,
  };
}

export function listPrismEvents() {
  return MACRO_EVENTS;
}
