/** Dune Analytics API — on-chain macro context for PRISM (optional query id). */

export function hasDuneKey(): boolean {
  return Boolean(process.env.DUNE_API_KEY?.trim());
}

function duneHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "X-DUNE-API-KEY": process.env.DUNE_API_KEY!.trim(),
  };
}

export type DuneQuerySnippet = {
  queryId: number;
  rowCount: number;
  sample: Record<string, unknown>;
};

/** Latest rows from a saved Dune query (set DUNE_PRISM_QUERY_ID on Vercel). */
export async function fetchDunePrismSnippet(limit = 3): Promise<DuneQuerySnippet | null> {
  const key = process.env.DUNE_API_KEY?.trim();
  const rawId = process.env.DUNE_PRISM_QUERY_ID?.trim();
  if (!key || !rawId) return null;

  const queryId = Number(rawId);
  if (!Number.isFinite(queryId)) return null;

  try {
    const res = await fetch(
      `https://api.dune.com/api/v1/query/${queryId}/results?limit=${limit}`,
      { headers: duneHeaders(), signal: AbortSignal.timeout(12_000) },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      result?: { rows?: Array<Record<string, unknown>> };
    };
    const rows = data.result?.rows ?? [];
    if (rows.length === 0) return null;

    return { queryId, rowCount: rows.length, sample: rows[0] };
  } catch (e) {
    console.warn("Dune query results unavailable:", e);
    return null;
  }
}

export async function probeDune(): Promise<{
  ok: boolean;
  configured: boolean;
  queryConfigured: boolean;
  error?: string;
}> {
  if (!hasDuneKey()) {
    return { ok: false, configured: false, queryConfigured: false, error: "DUNE_API_KEY not set" };
  }

  try {
    const res = await fetch("https://api.dune.com/api/v1/datasets?limit=1", {
      headers: duneHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, configured: true, queryConfigured: Boolean(process.env.DUNE_PRISM_QUERY_ID), error: "invalid key" };
    }
    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        queryConfigured: Boolean(process.env.DUNE_PRISM_QUERY_ID),
        error: `HTTP ${res.status}`,
      };
    }
    return { ok: true, configured: true, queryConfigured: Boolean(process.env.DUNE_PRISM_QUERY_ID) };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      queryConfigured: Boolean(process.env.DUNE_PRISM_QUERY_ID),
      error: e instanceof Error ? e.message : "timeout",
    };
  }
}
