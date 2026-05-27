/**
 * Perception.to REST API — narrative / attention index.
 * https://api.perception.to · Bearer PERCEPTION_API_KEY
 */

const BASE = "https://api.perception.to";

function cleanKey(): string | undefined {
  const raw =
    process.env.PERCEPTION_API_KEY?.trim() ??
    process.env.PERCEPTION_API_BEARER?.trim();
  if (!raw) return undefined;
  return raw.replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
}

export function hasPerceptionKey(): boolean {
  return Boolean(cleanKey());
}

export type PerceptionEntry = {
  symbol?: string;
  name?: string;
  score?: number;
  label?: string;
  summary?: string;
  raw: Record<string, unknown>;
};

function normalizeEntries(json: unknown): PerceptionEntry[] {
  if (!json || typeof json !== "object") return [];

  const root = json as Record<string, unknown>;
  const list = Array.isArray(root)
    ? root
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.results)
        ? root.results
        : Array.isArray(root.items)
          ? root.items
          : Array.isArray(root.index)
            ? root.index
            : [];

  return list
    .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
    .map((row) => {
      const symbol = String(
        row.symbol ?? row.ticker ?? row.token ?? row.asset ?? "",
      ).trim();
      const name = String(row.name ?? row.title ?? "").trim();
      const score = Number(row.score ?? row.index ?? row.attention ?? row.value ?? NaN);
      return {
        symbol: symbol || undefined,
        name: name || undefined,
        score: Number.isFinite(score) ? score : undefined,
        label: String(row.label ?? row.sentiment ?? "").trim() || undefined,
        summary: String(row.summary ?? row.description ?? row.narrative ?? "").trim() || undefined,
        raw: row,
      };
    });
}

export async function fetchPerceptionIndex(): Promise<PerceptionEntry[]> {
  const key = cleanKey();
  if (!key) return [];

  try {
    const res = await fetch(`${BASE}/perception-index`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return normalizeEntries(json);
  } catch {
    return [];
  }
}

let indexCache: { at: number; entries: PerceptionEntry[] } | null = null;
const INDEX_CACHE_MS = 10 * 60 * 1000;

export async function getPerceptionIndexCached(): Promise<PerceptionEntry[]> {
  if (indexCache && Date.now() - indexCache.at < INDEX_CACHE_MS) {
    return indexCache.entries;
  }
  const entries = await fetchPerceptionIndex();
  indexCache = { at: Date.now(), entries };
  return entries;
}

export function matchPerceptionForSymbol(
  symbol: string,
  name: string | undefined,
  entries: PerceptionEntry[],
): PerceptionEntry | undefined {
  const sym = symbol.replace(/^\$/, "").trim().toLowerCase();
  if (!sym) return undefined;

  for (const e of entries) {
    const es = (e.symbol ?? "").toLowerCase();
    const en = (e.name ?? "").toLowerCase();
    if (es === sym || es.includes(sym) || sym.includes(es)) return e;
    if (name && en && en.includes(name.split(/\s+/)[0]!.toLowerCase())) return e;
  }
  return undefined;
}

export async function probePerception(): Promise<{
  ok: boolean;
  configured: boolean;
  error?: string;
  count?: number;
}> {
  if (!hasPerceptionKey()) {
    return { ok: false, configured: false, error: "PERCEPTION_API_KEY not set" };
  }
  const entries = await fetchPerceptionIndex();
  if (entries.length > 0) return { ok: true, configured: true, count: entries.length };
  return { ok: false, configured: true, error: "empty index or HTTP error" };
}
