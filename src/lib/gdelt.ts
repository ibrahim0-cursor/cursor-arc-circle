export type GdeltArticle = {
  title: string;
  url: string;
  source: string;
  date: string;
  tone?: number;
};

export async function fetchGdeltArticles(query: string, max = 8): Promise<GdeltArticle[]> {
  try {
    const params = new URLSearchParams({
      query,
      mode: "ArtList",
      maxrecords: String(max),
      format: "json",
      sort: "DateDesc",
    });

    const res = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      articles?: Array<{
        title?: string;
        url?: string;
        domain?: string;
        seendate?: string;
        tone?: number;
      }>;
    };

    return (data.articles ?? []).map((article) => ({
      title: article.title ?? "Untitled",
      url: article.url ?? "#",
      source: article.domain ?? "GDELT",
      date: article.seendate ?? new Date().toISOString(),
      tone: article.tone,
    }));
  } catch (error) {
    console.warn("GDELT unavailable:", error);
    return [];
  }
}

export const MACRO_EVENTS = [
  {
    id: "fed-cut-june",
    label: "Fed cuts rates at next FOMC meeting",
    category: "macro" as const,
    query: "Federal Reserve interest rate decision",
  },
  {
    id: "cpi-hot",
    label: "US CPI prints above consensus this month",
    category: "macro" as const,
    query: "US CPI inflation report",
  },
  {
    id: "oil-90",
    label: "WTI crude oil closes above $90 this week",
    category: "markets" as const,
    query: "oil price WTI crude",
  },
  {
    id: "middle-east-escalation",
    label: "Major Middle East geopolitical escalation",
    category: "geopolitical" as const,
    query: "Middle East conflict escalation",
  },
  {
    id: "btc-100k",
    label: "Bitcoin trades above $100K this month",
    category: "markets" as const,
    query: "Bitcoin price rally",
  },
  {
    id: "us-china-tariffs",
    label: "New US-China tariff escalation announced",
    category: "geopolitical" as const,
    query: "US China tariffs trade policy",
  },
];
