/** Score headlines against the active PRISM event (post–Generate Forecast). */

import type { CommunityPulseItem } from "./community-pulse";
import type { OpenNewsItem } from "./opennews-6551";
import { dedupeHeadlines, isQualityHeadline } from "./intel-headline-quality";

export type IntelItem = { title: string; source: string; url?: string; link?: string };

const STOP = new Set([
  "the", "a", "an", "at", "on", "in", "to", "for", "of", "and", "or", "is", "this", "that", "with",
  "will", "next", "month", "week", "year", "above", "below", "major", "new", "this",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Extract search keywords from custom user-typed events. */
export function extractEventKeywords(eventLabel: string, extraQuery?: string): string[] {
  const merged = [...tokens(eventLabel), ...tokens(extraQuery ?? "")];
  const uniq = [...new Set(merged)];
  return uniq.slice(0, 12);
}

function relevanceScore(title: string, eventTerms: string[]): number {
  if (eventTerms.length === 0) return 0.5;
  const lower = title.toLowerCase();
  const titleTerms = new Set(tokens(title));
  let hits = 0;
  for (const t of eventTerms) {
    if (titleTerms.has(t) || lower.includes(t)) hits += 1;
  }
  return Math.min(1, hits / Math.max(2, Math.min(eventTerms.length, 6)));
}

export function filterIntelForEvent(
  items: IntelItem[],
  eventLabel: string,
  extraQuery?: string,
  minScore = 0.2,
): Array<IntelItem & { relevancePct: number }> {
  const eventTerms = extractEventKeywords(eventLabel, extraQuery);
  const scored = dedupeHeadlines(
    items.filter((item) =>
      isQualityHeadline(item.title, { source: item.source, url: item.url ?? item.link }),
    ),
  )
    .map((item) => ({
      ...item,
      relevancePct: Math.round(relevanceScore(item.title, eventTerms) * 100),
    }))
    .sort((a, b) => b.relevancePct - a.relevancePct);

  const matched = scored.filter((item) => item.relevancePct >= minScore * 100);
  if (matched.length >= 3) return matched;
  return scored.slice(0, Math.max(3, Math.min(8, scored.length)));
}

export function mergeIntelSources(intel: {
  gdelt?: IntelItem[];
  news?: IntelItem[];
  eventRegistry?: IntelItem[];
  openNews?: OpenNewsItem[];
  community?: CommunityPulseItem[];
}): IntelItem[] {
  const seen = new Set<string>();
  const out: IntelItem[] = [];

  const push = (item: IntelItem, aiScore?: number) => {
    const key = item.title.slice(0, 80).toLowerCase();
    if (seen.has(key)) return;
    if (
      !isQualityHeadline(item.title, {
        source: item.source,
        url: item.url ?? item.link,
        aiScore,
        minScore: 0.15,
      })
    ) {
      return;
    }
    seen.add(key);
    out.push(item);
  };

  for (const list of [intel.gdelt, intel.news, intel.eventRegistry]) {
    for (const item of list ?? []) {
      push({ title: item.title, source: item.source, url: item.url ?? item.link });
    }
  }
  for (const item of intel.openNews ?? []) {
    push({ title: item.title, source: item.source || "6551 OpenNews", url: item.link }, item.aiScore);
  }
  for (const item of intel.community ?? []) {
    if (item.kind === "meme" || item.kind === "twitter") continue;
    push({ title: item.title, source: item.source, url: item.link });
  }
  return out;
}

export type PrismIntelStatus = {
  totalRaw: number;
  feedCount: number;
  openNewsQuotaExhausted: boolean;
  usingFallback: boolean;
  message?: string;
};

export function buildIntelStatus(
  rawCount: number,
  feedCount: number,
  opts: { openNewsQuotaExhausted?: boolean; gdeltCount?: number; newsApiCount?: number },
): PrismIntelStatus {
  const usingFallback =
    Boolean(opts.openNewsQuotaExhausted) ||
    (feedCount > 0 && (opts.gdeltCount ?? 0) > 0 && feedCount <= (opts.gdeltCount ?? 0));
  let message: string | undefined;
  if (feedCount === 0 && rawCount === 0) {
    message = "No headlines returned from news APIs — check server env keys or try again.";
  } else if (feedCount === 0 && rawCount > 0) {
    message = "Headlines fetched but none matched this event — try a more specific query.";
  } else if (opts.openNewsQuotaExhausted) {
    message = "Intel limited — 6551 quota hit; showing GDELT / NewsAPI / Event Registry fallbacks.";
  } else if (usingFallback && feedCount < 3) {
    message = "Intel limited — using fallback sources; primary feed returned few matches.";
  }
  return {
    totalRaw: rawCount,
    feedCount,
    openNewsQuotaExhausted: Boolean(opts.openNewsQuotaExhausted),
    usingFallback,
    message,
  };
}
