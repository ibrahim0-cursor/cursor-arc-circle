import OpenAI from "openai";

export function getAiClient(): OpenAI | null {
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    return new OpenAI({
      apiKey: groq,
      baseURL: "https://api.groq.com/openai/v1",
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
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function aiProviderLabel() {
  return process.env.GROQ_API_KEY?.trim() ? "Groq" : process.env.OPENAI_API_KEY?.trim() ? "OpenAI" : "heuristic";
}
