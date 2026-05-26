export type CryptoNewsItem = {
  title: string;
  source: string;
  link: string;
  sentiment?: string;
  category?: string;
};

export async function fetchCryptoNewsHeadlines(
  query?: string,
  limit = 6,
): Promise<CryptoNewsItem[]> {
  try {
    const params = new URLSearchParams({ limit: String(Math.min(limit, 20)) });
    if (query?.trim()) params.set("category", query.includes("defi") ? "defi" : "bitcoin");
    const res = await fetch(`https://cryptocurrency.cv/api/news?${params}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      articles?: Array<{
        title?: string;
        source?: string;
        link?: string;
        sentiment?: string;
        category?: string;
      }>;
    };
    return (json.articles ?? [])
      .filter((a) => a.title && a.link)
      .map((a) => ({
        title: a.title!,
        source: a.source ?? "News",
        link: a.link!,
        sentiment: a.sentiment,
        category: a.category,
      }));
  } catch {
    return [];
  }
}
