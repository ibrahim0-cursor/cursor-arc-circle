"use client";

import { AlertCircle, MessageCircle, Radio, Sparkles } from "lucide-react";
import type { TokenSocialIntel } from "@/lib/social-intel";

export function NexusSocialIntelPanel({ social }: { social: TokenSocialIntel }) {
  const lc = social.lunarcrush;
  const showDegraded = Boolean(social.degradedMessage) && !social.hasData;

  if (!social.hasData && !showDegraded && social.status.lunarcrush === "missing" && social.status.reddit === "missing" && social.status.neynar === "missing") {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/[0.06] p-3">
      <div className="flex items-center gap-2">
        <Radio className="h-4 w-4 text-fuchsia-200" />
        <p className="text-sm font-semibold text-white">Social intel · {social.symbol}</p>
      </div>

      {showDegraded && (
        <p className="flex items-start gap-1.5 text-xs text-amber-100/90">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          {social.degradedMessage}
        </p>
      )}

      {lc && (
        <div className="flex flex-wrap gap-2 text-[11px] text-fuchsia-100/90">
          {lc.galaxyScore != null && (
            <span className="rounded-md border border-fuchsia-400/30 bg-black/25 px-2 py-0.5">
              Galaxy {lc.galaxyScore}
            </span>
          )}
          {lc.altRank != null && (
            <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5">
              Alt rank #{lc.altRank}
            </span>
          )}
          {lc.socialVolume24h != null && (
            <span className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5">
              Vol {lc.socialVolume24h.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {social.lunarcrushPosts.length > 0 && (
        <ul className="space-y-1 text-xs text-white/70">
          {social.lunarcrushPosts.slice(0, 2).map((p) => (
            <li key={p.title} className="line-clamp-1">
              <Sparkles className="mr-1 inline h-3 w-3 text-fuchsia-300" />
              {p.title}
            </li>
          ))}
        </ul>
      )}

      {social.reddit.length > 0 && (
        <ul className="space-y-1 text-xs text-white/70">
          {social.reddit.slice(0, 2).map((p) => (
            <li key={p.id} className="line-clamp-1">
              <MessageCircle className="mr-1 inline h-3 w-3 text-orange-300" />
              r/{p.subreddit}: {p.title}
            </li>
          ))}
        </ul>
      )}

      {social.farcaster.length > 0 && (
        <ul className="space-y-1 text-xs text-white/70">
          {social.farcaster.slice(0, 2).map((c) => (
            <li key={c.hash || c.text} className="line-clamp-2">
              @{c.authorUsername ?? "fc"}: {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
