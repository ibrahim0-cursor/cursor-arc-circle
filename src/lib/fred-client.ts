/** FRED API v1 — macro series for PRISM (requires FRED_API_KEY). */

export type FredObservation = {
  date: string;
  value: number;
};

export type FredSeriesContext = {
  seriesId: string;
  label: string;
  latest: FredObservation;
  prior: FredObservation | null;
  changePct: number | null;
  unit: string;
};

const EVENT_SERIES: Record<string, { id: string; label: string }> = {
  "fed-cut-june": { id: "DFF", label: "Fed funds effective rate" },
  "cpi-hot": { id: "CPIAUCSL", label: "US CPI (all urban consumers)" },
  "oil-90": { id: "DCOILWTICO", label: "WTI crude oil spot" },
};

export function hasFredKey(): boolean {
  return Boolean(process.env.FRED_API_KEY?.trim());
}

function parseFredValue(raw: string): number | null {
  if (!raw || raw === ".") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function fetchFredSeriesContext(eventId: string): Promise<FredSeriesContext | null> {
  const apiKey = process.env.FRED_API_KEY?.trim();
  const meta = EVENT_SERIES[eventId];
  if (!apiKey || !meta) return null;

  try {
    const params = new URLSearchParams({
      series_id: meta.id,
      api_key: apiKey,
      file_type: "json",
      sort_order: "desc",
      limit: "6",
    });

    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?${params}`, {
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      observations?: Array<{ date?: string; value?: string }>;
      units?: string;
    };

    const valid: FredObservation[] = [];
    for (const o of data.observations ?? []) {
      const value = parseFredValue(o.value ?? "");
      if (value != null && o.date) valid.push({ date: o.date, value });
    }
    if (valid.length === 0) return null;

    const latest = valid[0];
    const prior = valid[1] ?? null;
    const changePct =
      prior && prior.value !== 0
        ? ((latest.value - prior.value) / Math.abs(prior.value)) * 100
        : null;

    return {
      seriesId: meta.id,
      label: meta.label,
      latest,
      prior,
      changePct,
      unit: data.units ?? "",
    };
  } catch (e) {
    console.warn("FRED unavailable:", e);
    return null;
  }
}

export async function probeFred(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  if (!hasFredKey()) {
    return { ok: false, configured: false, error: "FRED_API_KEY not set" };
  }
  const ctx = await fetchFredSeriesContext("fed-cut-june");
  if (ctx) return { ok: true, configured: true };
  return { ok: false, configured: true, error: "series fetch failed" };
}
