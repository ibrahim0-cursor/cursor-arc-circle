export {
  isBlueChip,
  tokenKey,
  scoreLiveFeedToken,
  scoreAlphaCandidate,
  curateLiveFeed,
  curateAlphaCandidates,
} from "./feed-curation";

export type StablecoinCheckInput = {
  symbol: string;
  name?: string;
  tokenAddress?: string;
  chainId?: string;
  priceUsd?: number;
  change24h?: number;
};

/** Symbols treated as stablecoins — excluded from live feed & alpha scan */
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
  "susdai",
  "susde",
  "usd0",
  "usds",
  "musd",
  "msusd",
  "susd",
  "usdm",
  "wusdm",
  "mim",
  "usdp",
  "gho",
  "dola",
  "alusd",
  "eusd",
  "usdx",
  "usdy",
  "dusd",
  "ust",
  "ustc",
  "usdk",
  "usdn",
  "usdr",
  "ageur",
  "eurt",
  "xusd",
  "husd",
  "ousd",
  "iusd",
  "cusdo",
  "zusd",
  "rai",
  "par",
  "usdh",
  "usdj",
  "usdv",
  "usdtb",
  "usdt0",
]);

/** Canonical stable addresses on EVM chains (lowercase) */
const STABLE_ADDRESSES = new Set([
  // Ethereum
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0x853d955acef822db058eb8505911ed77f175b99e", // FRAX
  "0x5f98805a4e8be255a32880fdec7f6728c6568ba0", // LUSD
  "0x0000000000085d4780b73119b644a5c335dc2a104", // TUSD
  "0x4fabb145d64652a948d72533023f6e7f229c133a", // BUSD
  "0x8e870d67f660d95d085beffc2238f457c874fa8f", // USDP
  "0x0c10bfacbd9379290ad44c5242676ec148daf829", // USDD
  "0x57ab1ec28d129621052fa65e50febe7334d166e8", // sUSD
  "0x056fd409e1d7a124bd7017459dfea2f387bd3d0c", // GUSD
  "0x99d8a9c45b2eca8864373a26d1459e3dff1e17fe", // MIM
  "0x4c9edd5852cd905f086c759e8383e09bff1e68b3", // USDe
  "0x59d9356e565ab3a36dd77763fc0d87feaf85508c", // USDM (Mountain Protocol)
  "0xe2f2a5c287993345a840db3b0845fbc70f5935a5", // mStable MUSD
  "0xaca92e438df0b2401ff60da7e4337b687a2435da", // MetaMask mUSD
  "0xdd468a1ddc392dcdbef6db6e34e89aa338f9f186", // Mezo MUSD
  // Base
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
  "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", // DAI
  "0xd9aaec86b65d86f65a8cff4ae4781e793bd69b7", // USDbC
  // Arbitrum
  "0xaf88d065e77c1c19323b3857cc635839f304932", // USDC
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", // USDC.e
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", // USDT
  "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1", // DAI
  "0x17fc002b466eec40dae837fc4be5c67993ddbd6f", // FRAX
  // Arc sentinel (swap only — never in feed)
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
]);

const STABLE_NAME_HINTS = [
  "usd coin",
  "tether",
  "dai stable",
  "paypal usd",
  "eur coin",
  "synthetic usd",
  "stablecoin",
  "mountain protocol",
  "maker dao",
  "liquity usd",
  "gemini dollar",
  "first digital usd",
  "pegged",
  "wrapped usd",
  "metamask usd",
  "mstable",
  "mezo usd",
  "metronome",
  "synth usd",
  "synthetic dollar",
];

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toLowerCase().replace(/^\$/, "");
}

function matchesStableSymbol(sym: string, priceUsd?: number): boolean {
  if (STABLE_SYMBOLS.has(sym)) return true;
  if (/^s?usd[a-z0-9]{0,6}$/i.test(sym)) return true;
  if (/^[a-z]{1,4}usd[a-z0-9]{0,2}$/i.test(sym) && sym.length <= 7) return true;
  if (/^usd[a-z0-9]{0,4}$/i.test(sym) && sym.length <= 7) return true;
  if (/^(eur|euro)[a-z0-9]{0,3}$/i.test(sym) && sym.length <= 6) return true;
  /* msUSD, wsUSD, synth-*USD, etc. */
  if (/usd$/i.test(sym) && sym.length >= 3 && sym.length <= 12) {
    if (priceUsd == null || (priceUsd >= 0.9 && priceUsd <= 1.1)) return true;
  }
  return false;
}

function matchesStableName(name: string): boolean {
  const n = name.toLowerCase();
  return STABLE_NAME_HINTS.some((h) => n.includes(h));
}

function matchesStableAddress(tokenAddress?: string): boolean {
  if (!tokenAddress) return false;
  return STABLE_ADDRESSES.has(tokenAddress.toLowerCase());
}

/** Pegged ~$1 with low 24h move — only when symbol/name also hints at a stable */
function matchesPriceHeuristic(
  priceUsd?: number,
  change24h?: number,
  sym?: string,
  name?: string,
): boolean {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return false;
  if (priceUsd < 0.97 || priceUsd > 1.03) return false;
  if (Math.abs(change24h ?? 0) > 2.5) return false;

  const hint = `${sym ?? ""} ${name ?? ""}`.toLowerCase();
  return /usd|eur|dai|tether|stable|peg|mountain|synth|metronome/.test(hint);
}

export function isStablecoin(
  symbol: string,
  name?: string,
  opts?: Omit<StablecoinCheckInput, "symbol" | "name">,
): boolean {
  const sym = normalizeSymbol(symbol);
  if (matchesStableSymbol(sym, opts?.priceUsd)) return true;
  if (name && matchesStableName(name)) return true;
  if (matchesStableAddress(opts?.tokenAddress)) return true;
  if (matchesPriceHeuristic(opts?.priceUsd, opts?.change24h, sym, name)) return true;
  return false;
}

export function filterTradableTokens<
  T extends {
    symbol: string;
    name?: string;
    tokenAddress?: string;
    chainId?: string;
    priceUsd?: number;
    change24h?: number;
  },
>(tokens: T[]): T[] {
  return tokens.filter(
    (t) =>
      !isStablecoin(t.symbol, t.name, {
        tokenAddress: t.tokenAddress,
        chainId: t.chainId,
        priceUsd: t.priceUsd,
        change24h: t.change24h,
      }),
  );
}

/** Server-side live feed guard — same rules as filterTradableTokens */
export const filterLiveFeedTokens = filterTradableTokens;

import { isAlphaGlitchOrSpam } from "./alpha-quality";

/** Alpha scan — stables out + glitch/spam/ambiguous tickers */
export function filterAlphaScanTokens<
  T extends {
    symbol: string;
    name?: string;
    tokenAddress?: string;
    chainId?: string;
    priceUsd?: number;
    change24h?: number;
    liquidityUsd?: number;
    volume24h?: number;
    marketCap?: number;
    fdv?: number;
  },
>(tokens: T[]): T[] {
  return filterTradableTokens(tokens).filter(
    (t) =>
      !isAlphaGlitchOrSpam({
        symbol: t.symbol,
        name: t.name ?? "",
        priceUsd: t.priceUsd ?? 0,
        change24h: t.change24h ?? 0,
        liquidityUsd: (t as { liquidityUsd?: number }).liquidityUsd ?? 0,
        volume24h: (t as { volume24h?: number }).volume24h ?? 0,
        marketCap: (t as { marketCap?: number }).marketCap,
        fdv: (t as { fdv?: number }).fdv,
      }),
  );
}
