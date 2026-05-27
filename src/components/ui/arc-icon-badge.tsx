"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "home" | "nexus" | "prism" | "neutral";

const styles: Record<Theme, string> = {
  home: "from-violet-500/35 to-indigo-600/25 text-violet-100 ring-violet-400/35 shadow-[0_0_20px_rgba(168,85,247,0.25)]",
  nexus:
    "from-violet-500/40 to-emerald-500/30 text-emerald-50 ring-violet-400/35 shadow-[0_0_22px_rgba(168,85,247,0.28),0_0_14px_rgba(18,232,168,0.2)]",
  prism: "from-amber-500/40 to-orange-600/25 text-amber-100 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.28)]",
  neutral: "from-white/15 to-white/5 text-white/85 ring-white/20",
};

/** Rounded icon badge used across panels and nav */
export function ArcIconBadge({
  icon: Icon,
  theme = "neutral",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  theme?: Theme;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconDim = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn(
        "arc-icon-badge flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
        dim,
        styles[theme],
        className,
      )}
    >
      <Icon className={iconDim} strokeWidth={1.75} />
    </div>
  );
}
