"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "home" | "nexus" | "prism" | "neutral";

const themeClass: Record<Theme, string> = {
  home: "arc-icon-3d-home",
  nexus: "arc-icon-3d-nexus",
  prism: "arc-icon-3d-prism",
  neutral: "arc-icon-3d-neutral",
};

/** Lightweight 3D-style icon — CSS transforms only (GPU-friendly) */
export function ArcIcon3d({
  icon: Icon,
  theme = "home",
  size = "md",
  className,
  delay = 0,
}: {
  icon: LucideIcon;
  theme?: Theme;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Stagger float animation (seconds) */
  delay?: number;
}) {
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const iconDim = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn("arc-icon-3d", themeClass[theme], dim, className)}
      style={{ animationDelay: `${delay}s` }}
      aria-hidden
    >
      <div className="arc-icon-3d-plate">
        <div className="arc-icon-3d-shine" />
        <Icon className={cn("relative z-10", iconDim)} strokeWidth={1.65} />
      </div>
    </div>
  );
}
