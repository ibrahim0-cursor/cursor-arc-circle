"use client";

import { MessageCircle, Newspaper, Sparkles } from "lucide-react";
import type { CommunityPulse, CommunityPulseItem } from "@/lib/community-pulse";

const kindStyles: Record<CommunityPulseItem["kind"], string> = {
  meme: "border-amber-400/30 bg-amber-500/10",
  news: "border-cyan-400/25 bg-cyan-500/8",
  reddit: "border-orange-400/30 bg-orange-500/10",
  telegram: "border-sky-400/30 bg-sky-500/10",
  discord: "border-indigo-400/30 bg-indigo-500/10",
  stocktwits: "border-emerald-400/25 bg-emerald-500/8",
  twitter: "border-fuchsia-400/30 bg-fuchsia-500/10",
  apewisdom: "border-amber-400/40 bg-amber-500/15",
  hackernews: "border-orange-400/35 bg-orange-600/10",
  perception: "border-violet-400/35 bg-violet-500/12",
  opennews: "border-teal-400/35 bg-teal-500/12",
};

const kindLabels: Record<CommunityPulseItem["kind"], string> = {
  meme: "Meme buzz",
  news: "News",
  reddit: "Reddit",
  telegram: "Telegram",
  discord: "Discord",
  stocktwits: "Stocktwits",
  twitter: "X",
  apewisdom: "ApeWisdom",
  hackernews: "Hacker News",
  perception: "Perception",
  opennews: "6551 News",
};

export function CommunityPulsePanel({
  pulse,
  title = "Community pulse",
  compact,
}: {
  pulse: CommunityPulse;
  title?: string;
  compact?: boolean;
}) {
  if (pulse.items.length === 0) {
    return (
      <p className="text-xs text-white/50">
        No community headlines yet — add Telegram/Discord/Stocktwits keys or Reddit OAuth.
      </p>
    );
  }

  const limit = compact ? 4 : 8;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-[10px] text-white/45">
        Free sources — crypto news, meme chatter{pulse.redditBuzz ? ", Reddit" : ""}. No paid X API.
      </p>
      <ul className={`space-y-1.5 ${compact ? "max-h-[140px] overflow-y-auto" : ""}`}>
        {pulse.items.slice(0, limit).map((item, i) => (
          <li
            key={`${item.kind}-${i}-${item.title.slice(0, 24)}`}
            className={`rounded-lg border px-2.5 py-2 ${kindStyles[item.kind]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                {kindLabels[item.kind]}
              </span>
              <span className="text-[9px] text-white/40">{item.source}</span>
            </div>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-xs leading-snug text-white/90 hover:text-white underline-offset-2 hover:underline"
              >
                <KindIcon kind={item.kind} />
                {item.title}
              </a>
            ) : (
              <p className="mt-1 text-xs leading-snug text-white/90">
                <KindIcon kind={item.kind} />
                {item.title}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KindIcon({ kind }: { kind: CommunityPulseItem["kind"] }) {
  const cls = "mr-1 inline h-3 w-3 shrink-0 align-text-top";
  if (kind === "reddit") return <MessageCircle className={`${cls} text-orange-300`} />;
  if (kind === "meme") return <Sparkles className={`${cls} text-amber-300`} />;
  return <Newspaper className={`${cls} text-cyan-300`} />;
}
