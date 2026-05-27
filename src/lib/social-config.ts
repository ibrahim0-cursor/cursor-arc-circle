/** Premium social (LunarCrush metrics, Neynar cast search) requires paid plans. Default: off. */

export function usePremiumSocialApis(): boolean {
  return process.env.SOCIAL_USE_PREMIUM?.trim().toLowerCase() === "true";
}

export const FREE_SOCIAL_STACK_LABEL =
  "Free stack: DexScreener · crypto news · Birdeye · TA · Groq · Reddit (when approved)";
