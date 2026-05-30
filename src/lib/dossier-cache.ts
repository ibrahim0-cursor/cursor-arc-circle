import type { TokenDossierPayload } from "./nexus-research-dossier";

const TTL_MS = 90_000;
const store = new Map<string, { at: number; payload: TokenDossierPayload }>();

export function dossierCacheKey(
  chainId: string,
  address: string,
  tier: "feed" | "alpha",
  quick: boolean,
): string {
  return `${chainId}:${address.toLowerCase()}:${tier}:${quick ? "q" : "f"}`;
}

export function getDossierCache(key: string): TokenDossierPayload | null {
  const hit = store.get(key);
  if (!hit || Date.now() - hit.at > TTL_MS) {
    if (hit) store.delete(key);
    return null;
  }
  return hit.payload;
}

export function setDossierCache(key: string, payload: TokenDossierPayload): void {
  store.set(key, { at: Date.now(), payload });
  if (store.size > 80) {
    const oldest = [...store.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 20);
    for (const [k] of oldest) store.delete(k);
  }
}
