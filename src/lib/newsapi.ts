export type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
};

export async function fetchNewsArticles(query: string, max = 6): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(max),
    apiKey,
  });

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    articles?: Array<{
      title?: string;
      description?: string;
      url?: string;
      source?: { name?: string };
      publishedAt?: string;
    }>;
  };

  return (data.articles ?? []).map((article) => ({
    title: article.title ?? "Untitled",
    description: article.description ?? "",
    url: article.url ?? "#",
    source: article.source?.name ?? "News",
    publishedAt: article.publishedAt ?? new Date().toISOString(),
  }));
}
