import OpenAI from "openai";

export function getAiClient(): OpenAI | null {
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    return new OpenAI({
      apiKey: groq,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    return new OpenAI({
      apiKey: openrouter,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://trader-arc.vercel.app",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "MERIDIAN PRISM",
      },
    });
  }
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) return new OpenAI({ apiKey: openai });
  return null;
}

export function getAiModel() {
  if (process.env.GROQ_API_KEY?.trim()) {
    return process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  }
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function aiProviderLabel() {
  if (process.env.GROQ_API_KEY?.trim()) return "Groq";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "OpenRouter";
  if (process.env.OPENAI_API_KEY?.trim()) return "OpenAI";
  return "heuristic";
}

export function hasOpenRouterKey(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}
