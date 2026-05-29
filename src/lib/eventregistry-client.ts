/** Event Registry (newsapi.ai) — structured news for PRISM intel. */

export type EventRegistryArticle = {
  title: string;
  source: string;
  url: string;
  date: string;
};

export function hasEventRegistryKey(): boolean {
  return Boolean(process.env.EVENT_REGISTRY_API_KEY?.trim());
}

export async function fetchEventRegistryArticles(
  query: string,
  max = 6,
): Promise<EventRegistryArticle[]> {
  const apiKey = process.env.EVENT_REGISTRY_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      apiKey,
      keyword: query,
      lang: "eng",
      articlesSortBy: "date",
      articlesCount: String(Math.min(max, 10)),
      resultType: "articles",
    });

    const res = await fetch(`https://eventregistry.org/api/v1/article/getArticles?${params}`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      articles?: {
        results?: Array<{
          title?: string;
          url?: string;
          date?: string;
          source?: { title?: string };
        }>;
      };
    };

    return (data.articles?.results ?? []).slice(0, max).map((a) => ({
      title: a.title ?? "Untitled",
      source: a.source?.title ?? "Event Registry",
      url: a.url ?? "#",
      date: a.date ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.warn("Event Registry unavailable:", e);
    return [];
  }
}

export async function probeEventRegistry(): Promise<{
  ok: boolean;
  configured: boolean;
  error?: string;
}> {
  if (!hasEventRegistryKey()) {
    return { ok: false, configured: false, error: "EVENT_REGISTRY_API_KEY not set" };
  }
  const rows = await fetchEventRegistryArticles("Federal Reserve", 1);
  if (rows.length > 0) return { ok: true, configured: true };
  return { ok: false, configured: true, error: "empty or quota" };
}
