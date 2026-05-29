/** Score headlines against the active PRISM event (post–Generate Forecast). */

export type IntelItem = { title: string; source: string };

const STOP = new Set([
  "the", "a", "an", "at", "on", "in", "to", "for", "of", "and", "or", "is", "this", "that", "with",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function relevanceScore(title: string, eventTerms: string[]): number {
  if (eventTerms.length === 0) return 0.5;
  const titleTerms = new Set(tokens(title));
  let hits = 0;
  for (const t of eventTerms) {
    if (titleTerms.has(t) || title.toLowerCase().includes(t)) hits += 1;
  }
  return Math.min(1, hits / Math.max(2, Math.min(eventTerms.length, 6)));
}

export function filterIntelForEvent(
  items: IntelItem[],
  eventLabel: string,
  extraQuery?: string,
  minScore = 0.28,
): Array<IntelItem & { relevancePct: number }> {
  const eventTerms = [...new Set([...tokens(eventLabel), ...tokens(extraQuery ?? "")])];
  return items
    .map((item) => ({
      ...item,
      relevancePct: Math.round(relevanceScore(item.title, eventTerms) * 100),
    }))
    .filter((item) => item.relevancePct >= minScore * 100)
    .sort((a, b) => b.relevancePct - a.relevancePct);
}

export function mergeIntelSources(intel: {
  gdelt?: IntelItem[];
  news?: IntelItem[];
  eventRegistry?: IntelItem[];
}): IntelItem[] {
  const seen = new Set<string>();
  const out: IntelItem[] = [];
  for (const list of [intel.gdelt, intel.news, intel.eventRegistry]) {
    for (const item of list ?? []) {
      const key = item.title.slice(0, 80).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
