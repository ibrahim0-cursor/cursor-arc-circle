"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "home" | "nexus" | "prism" | "neutral";

const ring: Record<Variant, string> = {
  home: "border-violet-400/45 text-violet-200 shadow-[0_0_24px_rgba(168,85,247,0.28)]",
  nexus: "border-emerald-400/45 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.22)]",
  prism: "border-amber-400/45 text-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.2)]",
  neutral: "border-white/20 text-white/80 shadow-[0_0_16px_rgba(255,255,255,0.06)]",
};

/** Signature ARC icon mount — hex-cut frame, not playful circles */
export function ArcIconFrame({
  icon: Icon,
  variant = "neutral",
  size = "md",
  active,
  className,
}: {
  icon: LucideIcon;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  className?: string;
}) {
  const dim =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconDim = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn(
        "arc-icon-frame relative flex shrink-0 items-center justify-center",
        dim,
        ring[variant],
        active && "arc-icon-active",
        className,
      )}
    >
      <span className="arc-icon-frame-corner arc-icon-frame-corner-tl" />
      <span className="arc-icon-frame-corner arc-icon-frame-corner-br" />
      <Icon className={iconDim} strokeWidth={1.35} />
    </div>
  );
}
