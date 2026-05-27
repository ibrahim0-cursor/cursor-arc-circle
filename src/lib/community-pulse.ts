/**
 * Free community intel — crypto news, meme headlines, Reddit (when OAuth configured).
 * Shared by NEXUS (Alpha/Memory/Deep) and PRISM macro forecasts. No paid social APIs required.
 */

import { fetchCryptoNewsHeadlines, type CryptoNewsItem } from "./crypto-news";
import { fetchTokenSocialIntel, type TokenSocialIntel } from "./social-intel";

export type CommunityPulseItem = {
  kind: "news" | "meme" | "reddit";
  title: string;
  source: string;
  link?: string;
  subreddit?: string;
  score?: number;
};

export type CommunityPulse = {
  topic: string;
  items: CommunityPulseItem[];
  headlines: string[];
  memeBuzz?: string;
  redditBuzz?: string;
  newsBuzz?: string;
  social?: TokenSocialIntel;
};

function dedupeItems(items: CommunityPulseItem[]): CommunityPulseItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.kind}:${item.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newsToItems(articles: CryptoNewsItem[], kind: "news" | "meme"): CommunityPulseItem[] {
  return articles.map((a) => ({
    kind,
    title: a.title,
    source: a.source,
    link: a.link,
  }));
}

/** Topic = token symbol, event label, or macro query string */
export async function fetchCommunityPulse(topic: string, name?: string): Promise<CommunityPulse> {
  const key = topic.replace(/^\$/, "").trim() || "crypto";
  const memeQuery = key.length <= 6 ? `${key} meme` : `${key.split(/\s+/)[0]} meme crypto`;

  const [news, meme, social] = await Promise.all([
    fetchCryptoNewsHeadlines(key, 6),
    fetchCryptoNewsHeadlines(memeQuery, 5),
    fetchTokenSocialIntel(key, name),
  ]);

  const items = dedupeItems([
    ...newsToItems(meme, "meme"),
    ...newsToItems(news, "news"),
    ...social.reddit.map((p) => ({
      kind: "reddit" as const,
      title: p.title,
      source: `r/${p.subreddit}`,
      link: p.permalink,
      subreddit: p.subreddit,
      score: p.score,
    })),
  ]).slice(0, 12);

  const memeBuzz = items.find((i) => i.kind === "meme")?.title;
  const redditBuzz = items.find((i) => i.kind === "reddit")?.title;
  const newsBuzz = items.find((i) => i.kind === "news")?.title;

  return {
    topic: key.toUpperCase(),
    items,
    headlines: items.map((i) => i.title),
    memeBuzz,
    redditBuzz,
    newsBuzz,
    social,
  };
}

/** Best single line for Alpha cards / feed chips */
export function pickCommunityBuzz(pulse: CommunityPulse, newsFallback: string[] = []): string | undefined {
  return (
    pulse.redditBuzz ??
    pulse.memeBuzz ??
    pulse.newsBuzz ??
    newsFallback[0] ??
    pulse.items[0]?.title
  );
}

/** Macro / geopolitical events (PRISM) */
export async function fetchMacroCommunityPulse(eventLabel: string, query: string): Promise<CommunityPulse> {
  const q = query.trim() || eventLabel;
  const [news, meme, crypto] = await Promise.all([
    fetchCryptoNewsHeadlines(q.includes("fed") || q.includes("rate") ? "defi" : "bitcoin", 5),
    fetchCryptoNewsHeadlines("meme crypto", 4),
    fetchCryptoNewsHeadlines(q.slice(0, 40), 4),
  ]);

  const social =
    /crypto|btc|eth|meme|token|defi/i.test(eventLabel + q)
      ? await fetchTokenSocialIntel(
          /btc|bitcoin/i.test(q) ? "BTC" : /eth|ethereum/i.test(q) ? "ETH" : "crypto",
        )
      : null;

  const items = dedupeItems([
    ...newsToItems(crypto, "news"),
    ...newsToItems(news, "news"),
    ...newsToItems(meme, "meme"),
    ...(social?.reddit ?? []).map((p) => ({
      kind: "reddit" as const,
      title: p.title,
      source: `r/${p.subreddit}`,
      link: p.permalink,
      subreddit: p.subreddit,
      score: p.score,
    })),
  ]).slice(0, 12);

  return {
    topic: eventLabel.slice(0, 48),
    items,
    headlines: items.map((i) => i.title),
    memeBuzz: items.find((i) => i.kind === "meme")?.title,
    redditBuzz: items.find((i) => i.kind === "reddit")?.title,
    newsBuzz: items.find((i) => i.kind === "news")?.title,
    social: social ?? undefined,
  };
}
