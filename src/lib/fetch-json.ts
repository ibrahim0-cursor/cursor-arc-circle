/** Parse API responses safely — Vercel/HTML errors are not JSON. */
export async function readApiJson<T = Record<string, unknown>>(
  res: Response,
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { ok: res.ok, status: res.status, data: {} as T, error: "Empty response" };
  }
  try {
    const data = JSON.parse(text) as T;
    const err =
      !res.ok && typeof data === "object" && data && "error" in data
        ? String((data as { error?: string }).error)
        : !res.ok
          ? `HTTP ${res.status}`
          : undefined;
    return { ok: res.ok, status: res.status, data, error: err };
  } catch {
    const snippet = text.slice(0, 120).replace(/\s+/g, " ");
    return {
      ok: false,
      status: res.status,
      data: {} as T,
      error: snippet.startsWith("{") ? "Invalid JSON" : snippet || `HTTP ${res.status}`,
    };
  }
}
