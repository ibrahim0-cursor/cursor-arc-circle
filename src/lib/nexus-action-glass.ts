import { cn } from "@/lib/utils";

export type NexusActionGlassVariant = "buy" | "sell" | "autopilot" | "swap" | "live" | "alpha";

/** Frosted glass chips for NEXUS buy / sell / autopilot / swap controls */
export function nexusActionGlass(
  variant: NexusActionGlassVariant,
  active = false,
  className?: string,
) {
  return cn(
    "arc-glass-interactive nexus-action-glass",
    `nexus-action-glass--${variant}`,
    active && "nexus-action-glass--active",
    className,
  );
}
