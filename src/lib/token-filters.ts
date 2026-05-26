/** Symbols/names treated as stablecoins — hidden from live feed & memory scan */
const STABLE_SYMBOLS = new Set([
  "usdc",
  "usdt",
  "dai",
  "usdce",
  "usdbc",
  "busd",
  "tusd",
  "usdd",
  "frax",
  "lusd",
  "eurs",
  "eurc",
  "pyusd",
  "usd+",
  "susd",
  "gusd",
  "cusd",
  "fdusd",
  "usde",
  "crvusd",
]);

const STABLE_NAME_HINTS = ["usd coin", "tether", "dai stable", "paypal usd", "eur coin"];

export function isStablecoin(symbol: string, name?: string): boolean {
  const sym = symbol.trim().toLowerCase().replace(/^\$/, "");
  if (STABLE_SYMBOLS.has(sym)) return true;
  if (/^usd[a-z0-9]{0,4}$/i.test(sym) && sym.length <= 6) return true;
  const n = (name ?? "").toLowerCase();
  return STABLE_NAME_HINTS.some((h) => n.includes(h));
}

export function filterTradableTokens<T extends { symbol: string; name?: string }>(tokens: T[]): T[] {
  return tokens.filter((t) => !isStablecoin(t.symbol, t.name));
}
