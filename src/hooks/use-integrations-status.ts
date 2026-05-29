"use client";

import { useCallback, useEffect, useState } from "react";

export type IntegrationsStatus = {
  birdeye: boolean;
  birdeyeProbe: { ok: boolean; error?: string };
  openai: boolean;
  mode: string;
  lunarcrush?: boolean;
  lunarcrushProbe?: { ok: boolean; configured?: boolean; paidRequired?: boolean; error?: string };
  neynar?: boolean;
  neynarProbe?: { ok: boolean; configured?: boolean; error?: string; hubVersion?: string };
  reddit?: boolean;
  redditProbe?: { ok: boolean; configured?: boolean; error?: string };
  socialStack?: "free" | "premium";
  geckoterminal?: boolean;
  geckoProbe?: { ok: boolean; error?: string };
  moralis?: boolean;
  moralisProbe?: { ok: boolean; error?: string };
  etherscan?: boolean;
  etherscanProbe?: { ok: boolean; error?: string };
  github?: boolean;
  githubProbe?: { ok: boolean; error?: string };
  alphaLayers?: string;
  telegram?: boolean;
  telegramProbe?: { ok: boolean; configured?: boolean; error?: string };
  discordBot?: boolean;
  discordOAuth?: boolean;
  discordProbe?: { ok: boolean; configured?: boolean; oauthClient?: boolean; error?: string };
  gmgn?: boolean;
  gmgnProbe?: { ok: boolean; error?: string };
  opennews?: boolean;
  opennewsProbe?: { ok: boolean; configured?: boolean; tokenSource?: string; error?: string };
  opentwitter?: boolean;
  opentwitterProbe?: { ok: boolean; configured?: boolean; tokenSource?: string; error?: string };
  stocktwits?: boolean;
  stocktwitsProbe?: { ok: boolean; configured?: boolean; error?: string };
  rapidApiTwitter?: boolean;
  rapidTwitterProbe?: { ok: boolean; configured?: boolean; error?: string };
  socialData?: boolean;
  socialDataProbe?: { ok: boolean; configured?: boolean; error?: string };
};

export function useIntegrationsStatus() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/status?t=${Date.now()}`);
      if (res.ok) setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
