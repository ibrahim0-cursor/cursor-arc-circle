import { cn } from "@/lib/utils";

/** Frosted glass CTAs for PRISM — matches NEXUS glass CTA language */
export function prismGlassCta(
  variant: "forecast" | "event",
  className?: string,
  lit = true,
) {
  return cn(
    "arc-btn-signal prism-glass-cta prism-action-glass-btn",
    `prism-glass-cta--${variant}`,
    !lit && "prism-glass-cta--dim",
    className,
  );
}
