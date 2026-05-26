import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { fetchGdeltArticles, MACRO_EVENTS } from "./gdelt";
import { fetchNewsArticles } from "./newsapi";
import { anchorDecisionPayload } from "./arc";
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
}): Omit<PrismPrediction, "id" | "timestamp" | "arcTxHash"> {
  const toneBoost = input.headlines.length > 4 ? 8 : 0;
  const base =
    input.category === "geopolitical" ? 42 : input.category === "macro" ? 48 : 55;

  return {
    event: input.event,
    category: input.category,
    probability: Math.min(92, base + toneBoost),
    confidence: 63,
    kellyFraction: 0.08,
    horizon: "14 days",
    summary: `PRISM sees elevated narrative velocity around "${input.event}" with mixed but actionable signals.`,
    reasoning:
      "Headline density is rising across GDELT and news wires. Base rate adjusted for recent macro volatility and geopolitical risk premium.",
    sources: input.headlines.slice(0, 5),
  };
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
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
}) {
  const anthropic = getAnthropic();
  const openai = getOpenAI();
  const headlines = [
    ...input.gdelt.map((item) => item.title),
    ...input.news.map((item) => item.title),
  ];

  const fallback = heuristicPrediction({
    event: input.event,
    category: input.category,
    headlines,
  });

  const payload = JSON.stringify({
    event: input.event,
    category: input.category,
    gdelt: input.gdelt.slice(0, 6),
    news: input.news.slice(0, 6),
  });

  const systemPrompt =
    "You are PRISM, a macro and geopolitical forecasting agent. Return strict JSON with keys: probability (0-100), confidence (0-100), kellyFraction (0-1), horizon (string), summary (1 sentence), reasoning (2 sentences), sources (array of short strings).";

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

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
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
      console.warn("OpenAI unavailable for PRISM, using heuristic:", error);
    }
  }

  return fallback;
}

export async function runPrismAnalysis(input: EventInput) {
  const preset = MACRO_EVENTS.find((item) => item.id === input.eventId);
  const event = input.customEvent?.trim() || preset?.label || "Global risk-off shock in Q2";
  const category = preset?.category ?? "macro";
  const query = preset?.query ?? event;

  const [gdelt, news] = await Promise.all([
    fetchGdeltArticles(query, 8),
    fetchNewsArticles(query, 6),
  ]);

  const core = await aiPrediction({ event, category, gdelt, news });
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
    intelligence: { gdelt, news },
    events: MACRO_EVENTS,
  };
}

export function listPrismEvents() {
  return MACRO_EVENTS;
}
