"use client";

import type { LucideIcon } from "lucide-react";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { cn } from "@/lib/utils";

type Theme = "home" | "nexus" | "prism";

/** Glass panel with colored top stripe + optional icon — site-wide shell */
export function ArcPanel({
  children,
  className,
  theme = "home",
  title,
  icon,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  theme?: Theme;
  title?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("arc-panel", `arc-panel-${theme}`, className)}>
      <div className={cn("arc-panel-stripe", `arc-panel-stripe-${theme}`)} />
      {(title || icon || action) && (
        <header className="arc-panel-header">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <ArcIconBadge icon={icon} theme={theme} size="sm" />}
            {title && <h2 className="arc-panel-title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className="arc-panel-body">{children}</div>
    </section>
  );
}
