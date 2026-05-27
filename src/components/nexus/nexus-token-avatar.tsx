"use client";

import { cn } from "@/lib/utils";

function tokenAccent(symbol: string): number {
  const hues = [190, 260, 310, 160, 220, 280];
  const hash = symbol.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hues[hash % hues.length]!;
}

export function NexusTokenAvatar({
  symbol,
  icon,
  size = "md",
  className,
}: {
  symbol: string;
  icon?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-11 w-11";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  if (icon) {
    return (
      <div className={cn("nexus-token-avatar-frame shrink-0", dim, className)}>
        <img src={icon} alt={symbol} className="h-full w-full rounded-[10px] object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  const hue = tokenAccent(symbol);
  return (
    <div
      className={cn(
        "arc-token-hex flex shrink-0 items-center justify-center border border-white/10 font-bold text-white",
        dim,
        text,
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 70% 42% / 0.55), hsl(${(Number(hue) + 40) % 360} 65% 28% / 0.45))`,
      }}
      aria-hidden
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
