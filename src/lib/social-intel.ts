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
import { redditPublicForToken } from "./reddit-public";
import { usePremiumSocialApis } from "./social-config";
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
  } else if (usePremiumSocialApis() && social.status.lunarcrush === "402") {
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
  } else if (usePremiumSocialApis() && hasNeynarKey() && !neynarSearchEnabled()) {
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
  const premium = usePremiumSocialApis();
  const useLc = premium && hasLunarCrushKey();
  const useNeynarSearch = premium && hasNeynarKey() && neynarSearchEnabled();

  const status: TokenSocialIntel["status"] = {
    lunarcrush: useLc ? "empty" : "missing",
    reddit: "empty",
    neynar: useNeynarSearch ? "empty" : "missing",
  };

  const emptyCoin: LunarCrushResult<LunarCrushCoinSnapshot> = { data: null };
  const emptyPosts: LunarCrushResult<LunarCrushTopicPost[]> = { data: [] };

  const [lunarResult, lunarPostsResult, redditPosts, farcasterResult] = await Promise.all([
    useLc ? getCoinTopic(sym) : Promise.resolve(emptyCoin),
    useLc ? getTopicPosts(sym, 3) : Promise.resolve(emptyPosts),
    hasRedditCredentials()
      ? searchSubredditPosts(pickSubreddit(sym), query, 4)
      : redditPublicForToken(sym, 4),
    useNeynarSearch
      ? getCastsForKeyword(sym, 4)
      : Promise.resolve({ casts: [] } as NeynarCastSearchResult),
  ]);

  const lunarCoin = lunarResult.data;
  const lunarPosts = lunarPostsResult.data ?? [];
  const farcasterCasts = farcasterResult.casts;

  if (useLc) {
    const lc402 =
      lunarResult.reason?.includes("402") || lunarPostsResult.reason?.includes("402");
    if (lc402) status.lunarcrush = "402";
    else if (lunarCoin || lunarPosts.length > 0) status.lunarcrush = "ok";
    else status.lunarcrush = "empty";
  }

  status.reddit = redditPosts.length > 0 ? "ok" : hasRedditCredentials() ? "empty" : "empty";

  if (useNeynarSearch) {
    if (farcasterResult.paymentRequired) status.neynar = "402";
    else if (farcasterCasts.length > 0) status.neynar = "ok";
    else status.neynar = "empty";
  }

  const hasData =
    Boolean(lunarCoin) ||
    lunarPosts.length > 0 ||
    redditPosts.length > 0 ||
    farcasterCasts.length > 0;

  const degradedParts: string[] = [];
  if (premium) {
    if (status.lunarcrush === "402") {
      degradedParts.push("Social: LunarCrush subscription required (402)");
    }
    if (farcasterResult.paymentRequired) {
      degradedParts.push("Neynar cast search requires paid plan");
    }
    if (hasNeynarKey() && !neynarSearchEnabled()) {
      degradedParts.push("Neynar cast search disabled (NEYNAR_USE_SEARCH=false)");
    }
    if (!hasData && !hasRedditCredentials()) {
      degradedParts.push("No social hits for this symbol");
    }
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
