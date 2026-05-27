/**
 * Community intel — news, meme, Reddit, Telegram, Discord, Stocktwits, optional RapidAPI Twitter.
 * Shared by NEXUS (Alpha/Memory/Deep) and PRISM macro forecasts.
 */

import { fetchCryptoNewsHeadlines, type CryptoNewsItem } from "./crypto-news";
import { fetchTokenSocialIntel, type TokenSocialIntel } from "./social-intel";
import { fetchTelegramBuzz } from "./telegram-bot";
import { fetchDiscordBuzz } from "./discord-bot";
import { fetchStocktwitsBuzz } from "./stocktwits";
import { fetchRapidApiTwitterBuzz, hasRapidApiTwitter } from "./rapidapi-twitter";
import { hasSocialDataKey, searchSocialDataTweets } from "./social-data-api";
import { getApeWisdomMentionMap, lookupApeWisdom } from "./apewisdom";
import { searchHackerNewsForToken } from "./hackernews";
import {
  getPerceptionIndexCached,
  hasPerceptionKey,
  matchPerceptionForSymbol,
} from "./perception";
import { fetchOpenNewsForSymbol, fetchOpenNewsMacro, hasOpenNewsToken } from "./opennews-6551";
import {
  fetchOpenTwitterForToken,
  hasOpenTwitterToken,
  searchOpenTwitter,
} from "./opentwitter-6551";

export type CommunityPulseItem = {
  kind:
    | "news"
    | "meme"
    | "reddit"
    | "telegram"
    | "discord"
    | "stocktwits"
    | "twitter"
    | "apewisdom"
    | "hackernews"
    | "perception"
    | "opennews";
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
  telegramBuzz?: string;
  discordBuzz?: string;
  stocktwitsBuzz?: string;
  twitterBuzz?: string;
  apeWisdomBuzz?: string;
  hackerNewsBuzz?: string;
  perceptionBuzz?: string;
  opennewsBuzz?: string;
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

/** Fast path for bulk Alpha scan — news + social headline only */
export async function fetchCommunityPulseLite(topic: string, name?: string): Promise<CommunityPulse> {
  const key = topic.replace(/^\$/, "").trim() || "crypto";
  const [news, social, opennews] = await Promise.all([
    fetchCryptoNewsHeadlines(key, 4),
    fetchTokenSocialIntel(key, name),
    hasOpenNewsToken() ? fetchOpenNewsForSymbol(key, name, 4) : Promise.resolve([]),
  ]);

  const items = dedupeItems([
    ...newsToItems(news, "news"),
    ...social.reddit.slice(0, 2).map((p) => ({
      kind: "reddit" as const,
      title: p.title,
      source: `r/${p.subreddit}`,
      link: p.permalink,
      subreddit: p.subreddit,
      score: p.score,
    })),
    ...opennews.map((n) => ({
      kind: "opennews" as const,
      title: n.signal ? `${n.title} [${n.signal}]` : n.title,
      source: n.source,
      link: n.link,
      score: n.aiScore,
    })),
  ]).slice(0, 12);

  return {
    topic: key,
    items,
    headlines: items.map((i) => i.title),
    newsBuzz: items.find((i) => i.kind === "news")?.title,
    opennewsBuzz: items.find((i) => i.kind === "opennews")?.title,
    redditBuzz: items.find((i) => i.kind === "reddit")?.title,
    social,
  };
}

/** Topic = token symbol, event label, or macro query string */
export async function fetchCommunityPulse(topic: string, name?: string): Promise<CommunityPulse> {
  const key = topic.replace(/^\$/, "").trim() || "crypto";
  const memeQuery = key.length <= 6 ? `${key} meme` : `${key.split(/\s+/)[0]} meme crypto`;

  const twitterPromise = hasOpenTwitterToken()
    ? fetchOpenTwitterForToken(key, name, 6).then((rows) =>
        rows.map((r) => ({ id: r.url ?? r.text, text: r.text, author: r.author, url: r.url })),
      )
    : hasSocialDataKey()
      ? searchSocialDataTweets(key, 5)
      : hasRapidApiTwitter()
        ? fetchRapidApiTwitterBuzz(key, 4).then((rows) =>
            rows.map((r) => ({ id: r.link ?? r.title, text: r.title, author: r.author, url: r.link })),
          )
        : Promise.resolve([]);

  const [news, meme, social, telegram, discord, stocktwits, twitter, apeMap, hnHits, perceptionIndex, opennews] =
    await Promise.all([
      fetchCryptoNewsHeadlines(key, 6),
      fetchCryptoNewsHeadlines(memeQuery, 5),
      fetchTokenSocialIntel(key, name),
      fetchTelegramBuzz(key, name),
      fetchDiscordBuzz(key),
      fetchStocktwitsBuzz(key),
      twitterPromise,
      getApeWisdomMentionMap("all-crypto", 2),
      searchHackerNewsForToken(key, name),
      hasPerceptionKey() ? getPerceptionIndexCached() : Promise.resolve([]),
      hasOpenNewsToken() ? fetchOpenNewsForSymbol(key, name, 6) : Promise.resolve([]),
    ]);

  const apeRow = lookupApeWisdom(key, apeMap);
  const perceptionRow = matchPerceptionForSymbol(key, name, perceptionIndex);

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
    ...telegram.map((t) => ({
      kind: "telegram" as const,
      title: t.title,
      source: t.chatTitle ?? "Telegram",
      link: t.link,
    })),
    ...discord.map((d) => ({
      kind: "discord" as const,
      title: d.title,
      source: d.author ? `Discord @${d.author}` : "Discord",
      link: d.link,
    })),
    ...stocktwits.map((s) => ({
      kind: "stocktwits" as const,
      title: s.title,
      source: "Stocktwits",
      link: s.link,
    })),
    ...twitter.map((tw) => ({
      kind: "twitter" as const,
      title: tw.text,
      source: tw.author ? `X @${tw.author}` : hasSocialDataKey() ? "X (Social Data)" : "X",
      link: tw.url,
    })),
    ...(apeRow
      ? [
          {
            kind: "apewisdom" as const,
            title: `${apeRow.ticker} — rank #${apeRow.rank} · ${apeRow.mentions} mentions · ${apeRow.upvotes} upvotes`,
            source: "ApeWisdom (Reddit + 4chan)",
            score: apeRow.mentions,
          },
        ]
      : []),
    ...hnHits.map((h) => ({
      kind: "hackernews" as const,
      title: h.title,
      source: `HN · ${h.points} pts · ${h.numComments} comments`,
      link: h.url ?? h.storyUrl,
      score: h.points,
    })),
    ...(perceptionRow
      ? [
          {
            kind: "perception" as const,
            title:
              perceptionRow.summary ??
              `${perceptionRow.symbol ?? key} perception ${perceptionRow.score ?? "—"}`,
            source: "Perception.to",
            score: perceptionRow.score,
          },
        ]
      : []),
    ...opennews.map((n) => ({
      kind: "opennews" as const,
      title: n.signal ? `${n.title} [${n.signal}]` : n.title,
      source: n.source,
      link: n.link,
      score: n.aiScore,
    })),
  ]).slice(0, 20);

  const memeBuzz = items.find((i) => i.kind === "meme")?.title;
  const redditBuzz = items.find((i) => i.kind === "reddit")?.title;
  const newsBuzz = items.find((i) => i.kind === "news")?.title;
  const telegramBuzz = items.find((i) => i.kind === "telegram")?.title;
  const discordBuzz = items.find((i) => i.kind === "discord")?.title;
  const stocktwitsBuzz = items.find((i) => i.kind === "stocktwits")?.title;
  const twitterBuzz = items.find((i) => i.kind === "twitter")?.title;
  const apeWisdomBuzz = items.find((i) => i.kind === "apewisdom")?.title;
  const hackerNewsBuzz = items.find((i) => i.kind === "hackernews")?.title;
  const perceptionBuzz = items.find((i) => i.kind === "perception")?.title;
  const opennewsBuzz = items.find((i) => i.kind === "opennews")?.title;

  return {
    topic: key.toUpperCase(),
    items,
    headlines: items.map((i) => i.title),
    memeBuzz,
    redditBuzz,
    newsBuzz,
    telegramBuzz,
    discordBuzz,
    stocktwitsBuzz,
    twitterBuzz,
    apeWisdomBuzz,
    hackerNewsBuzz,
    perceptionBuzz,
    opennewsBuzz,
    social,
  };
}

/** Best single line for Alpha cards / feed chips */
export function pickCommunityBuzz(pulse: CommunityPulse, newsFallback: string[] = []): string | undefined {
  return (
    pulse.apeWisdomBuzz ??
    pulse.telegramBuzz ??
    pulse.discordBuzz ??
    pulse.redditBuzz ??
    pulse.hackerNewsBuzz ??
    pulse.perceptionBuzz ??
    pulse.opennewsBuzz ??
    pulse.twitterBuzz ??
    pulse.stocktwitsBuzz ??
    pulse.memeBuzz ??
    pulse.newsBuzz ??
    newsFallback[0] ??
    pulse.items[0]?.title
  );
}

/** Macro / geopolitical events (PRISM) */
export async function fetchMacroCommunityPulse(eventLabel: string, query: string): Promise<CommunityPulse> {
  const q = query.trim() || eventLabel;
  const [news, meme, crypto, opennewsMacro] = await Promise.all([
    fetchCryptoNewsHeadlines(q.includes("fed") || q.includes("rate") ? "defi" : "bitcoin", 5),
    fetchCryptoNewsHeadlines("meme crypto", 4),
    fetchCryptoNewsHeadlines(q.slice(0, 40), 4),
    hasOpenNewsToken() ? fetchOpenNewsMacro(q, 8) : Promise.resolve([]),
  ]);

  const sym = /btc|bitcoin/i.test(q) ? "BTC" : /eth|ethereum/i.test(q) ? "ETH" : "crypto";

  const social = /crypto|btc|eth|meme|token|defi/i.test(eventLabel + q)
    ? await fetchTokenSocialIntel(sym)
    : null;

  const twitterMacro = hasOpenTwitterToken()
    ? searchOpenTwitter({ keywords: q, maxResults: 6, minLikes: 20 }).then((rows) =>
        rows.map((r) => ({ id: r.url ?? r.text, text: r.text, author: r.author, url: r.url })),
      )
    : hasSocialDataKey()
      ? searchSocialDataTweets(sym, 4)
      : hasRapidApiTwitter()
        ? fetchRapidApiTwitterBuzz(sym, 3).then((rows) =>
            rows.map((r) => ({ id: r.link ?? r.title, text: r.title, author: r.author, url: r.link })),
          )
        : Promise.resolve([]);

  const [telegram, discord, stocktwits, twitter] = await Promise.all([
    fetchTelegramBuzz(sym),
    fetchDiscordBuzz(sym),
    fetchStocktwitsBuzz(sym),
    twitterMacro,
  ]);

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
    ...telegram.map((t) => ({
      kind: "telegram" as const,
      title: t.title,
      source: t.chatTitle ?? "Telegram",
      link: t.link,
    })),
    ...discord.map((d) => ({
      kind: "discord" as const,
      title: d.title,
      source: "Discord",
      link: d.link,
    })),
    ...stocktwits.map((s) => ({
      kind: "stocktwits" as const,
      title: s.title,
      source: "Stocktwits",
      link: s.link,
    })),
    ...twitter.map((tw) => ({
      kind: "twitter" as const,
      title: tw.text,
      source: tw.author ? `X @${tw.author} (6551)` : "X (6551)",
      link: tw.url,
    })),
    ...opennewsMacro.map((n) => ({
      kind: "opennews" as const,
      title: n.signal ? `${n.title} [${n.signal}]` : n.title,
      source: n.source,
      link: n.link,
      score: n.aiScore,
    })),
  ]).slice(0, 18);

  return {
    topic: eventLabel.slice(0, 48),
    items,
    headlines: items.map((i) => i.title),
    memeBuzz: items.find((i) => i.kind === "meme")?.title,
    redditBuzz: items.find((i) => i.kind === "reddit")?.title,
    newsBuzz: items.find((i) => i.kind === "news")?.title,
    telegramBuzz: items.find((i) => i.kind === "telegram")?.title,
    discordBuzz: items.find((i) => i.kind === "discord")?.title,
    stocktwitsBuzz: items.find((i) => i.kind === "stocktwits")?.title,
    twitterBuzz: items.find((i) => i.kind === "twitter")?.title,
    opennewsBuzz: items.find((i) => i.kind === "opennews")?.title,
    social: social ?? undefined,
  };
}
