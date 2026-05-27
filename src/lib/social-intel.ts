import {
  getCoinTopic,
  getTopicPosts,
  hasLunarCrushKey,
  type LunarCrushCoinSnapshot,
  type LunarCrushResult,
  type LunarCrushTopicPost,
} from "./lunarcrush";
import {
  getCastsForKeyword,
  hasNeynarKey,
  neynarSearchEnabled,
  type NeynarCastHit,
  type NeynarCastSearchResult,
} from "./neynar";
import { hasRedditCredentials, searchSubredditPosts, type RedditPost } from "./reddit";
import type { TokenSocialSnapshot } from "./storage";

export type SocialProviderStatus = "ok" | "missing" | "402" | "empty" | "error";

export type TokenSocialIntel = {
  symbol: string;
  lunarcrush: LunarCrushCoinSnapshot | null;
  lunarcrushPosts: LunarCrushTopicPost[];
  reddit: RedditPost[];
  farcaster: NeynarCastHit[];
  status: {
    lunarcrush: SocialProviderStatus;
    reddit: SocialProviderStatus;
    neynar: SocialProviderStatus;
  };
  degradedMessage?: string;
  hasData: boolean;
};

function pickSubreddit(symbol: string): string {
  const s = symbol.toLowerCase();
  if (["pepe", "doge", "shib", "bonk", "wif", "floki"].some((m) => s.includes(m))) {
    return "CryptoMoonShots";
  }
  return "CryptoCurrency";
}

export function tokenSocialFromIntel(social: TokenSocialIntel): TokenSocialSnapshot {
  const snapshot: TokenSocialSnapshot = {};

  if (social.lunarcrush) {
    snapshot.lunarcrush = {
      topic: social.lunarcrush.topic,
      galaxyScore: social.lunarcrush.galaxyScore,
      altRank: social.lunarcrush.altRank,
      sentiment: social.lunarcrush.sentiment,
      socialVolume24h: social.lunarcrush.socialVolume24h,
      socialDominance: social.lunarcrush.socialDominance,
      contributors: social.lunarcrush.contributors,
      degraded: social.status.lunarcrush === "402",
      reason:
        social.status.lunarcrush === "402"
          ? "LunarCrush subscription required (402)"
          : undefined,
    };
  } else if (social.status.lunarcrush === "402") {
    snapshot.lunarcrush = {
      degraded: true,
      reason: "LunarCrush subscription required (402)",
    };
  }

  if (social.farcaster.length > 0) {
    const top = social.farcaster[0];
    snapshot.farcaster = {
      castCount: social.farcaster.length,
      topCast: top.text,
      author: top.authorUsername,
    };
  } else if (hasNeynarKey() && neynarSearchEnabled() && social.status.neynar === "empty") {
    snapshot.farcaster = { castCount: 0 };
  } else if (hasNeynarKey() && !neynarSearchEnabled()) {
    snapshot.farcaster = {
      castCount: 0,
      degraded: true,
      reason: "Neynar cast search disabled — set NEYNAR_USE_SEARCH=true",
    };
  }

  if (social.reddit.length > 0) {
    snapshot.reddit = {
      postCount: social.reddit.length,
      topTitle: social.reddit[0].title,
      subreddit: social.reddit[0].subreddit,
    };
  }

  return snapshot;
}

export async function fetchTokenSocialIntel(symbol: string, name?: string): Promise<TokenSocialIntel> {
  const sym = symbol.replace(/^\$/, "").trim();
  const query = name && name.length > 2 ? `${sym} OR ${name.split(/\s+/)[0]}` : sym;

  const status: TokenSocialIntel["status"] = {
    lunarcrush: hasLunarCrushKey() ? "empty" : "missing",
    reddit: hasRedditCredentials() ? "empty" : "missing",
    neynar: hasNeynarKey() ? "empty" : "missing",
  };

  const emptyCoin: LunarCrushResult<LunarCrushCoinSnapshot> = { data: null };
  const emptyPosts: LunarCrushResult<LunarCrushTopicPost[]> = { data: [] };

  const [lunarResult, lunarPostsResult, redditPosts, farcasterResult] = await Promise.all([
    hasLunarCrushKey() ? getCoinTopic(sym) : Promise.resolve(emptyCoin),
    hasLunarCrushKey() ? getTopicPosts(sym, 3) : Promise.resolve(emptyPosts),
    hasRedditCredentials()
      ? searchSubredditPosts(pickSubreddit(sym), query, 4)
      : Promise.resolve([]),
    hasNeynarKey()
      ? getCastsForKeyword(sym, 4)
      : Promise.resolve({ casts: [] } as NeynarCastSearchResult),
  ]);

  const lunarCoin = lunarResult.data;
  const lunarPosts = lunarPostsResult.data ?? [];
  const farcasterCasts = farcasterResult.casts;

  if (hasLunarCrushKey()) {
    const lc402 =
      lunarResult.reason?.includes("402") || lunarPostsResult.reason?.includes("402");
    if (lc402) status.lunarcrush = "402";
    else if (lunarCoin || lunarPosts.length > 0) status.lunarcrush = "ok";
    else status.lunarcrush = "empty";
  }

  if (hasRedditCredentials()) {
    status.reddit = redditPosts.length > 0 ? "ok" : "empty";
  }

  if (hasNeynarKey()) {
    if (farcasterResult.paymentRequired) status.neynar = "402";
    else if (farcasterCasts.length > 0) status.neynar = "ok";
    else if (!neynarSearchEnabled()) status.neynar = "empty";
    else status.neynar = "empty";
  }

  const hasData =
    Boolean(lunarCoin) ||
    lunarPosts.length > 0 ||
    redditPosts.length > 0 ||
    farcasterCasts.length > 0;

  const missing = [
    status.lunarcrush === "missing" ? "LunarCrush" : null,
    status.reddit === "missing" ? "Reddit OAuth" : null,
    status.neynar === "missing" ? "Neynar" : null,
  ].filter(Boolean);

  const degradedParts: string[] = [];
  if (status.lunarcrush === "402") {
    degradedParts.push("Social: LunarCrush subscription required (402)");
  }
  if (farcasterResult.paymentRequired) {
    degradedParts.push("Neynar cast search requires paid plan");
  }
  if (hasNeynarKey() && !neynarSearchEnabled()) {
    degradedParts.push("Neynar cast search disabled (NEYNAR_USE_SEARCH=false)");
  }
  if (missing.length === 3) {
    degradedParts.push("No social API keys configured");
  } else if (missing.length > 0 && !hasData && status.lunarcrush !== "402") {
    degradedParts.push(`Partial setup — add ${missing.join(", ")} keys`);
  } else if (!hasData && missing.length === 0 && status.lunarcrush !== "402") {
    degradedParts.push("Social APIs connected but no hits for this symbol");
  }

  return {
    symbol: sym.toUpperCase(),
    lunarcrush: lunarCoin,
    lunarcrushPosts: lunarPosts,
    reddit: redditPosts,
    farcaster: farcasterCasts,
    status,
    degradedMessage: degradedParts.length > 0 ? degradedParts.join(" · ") : undefined,
    hasData,
  };
}
