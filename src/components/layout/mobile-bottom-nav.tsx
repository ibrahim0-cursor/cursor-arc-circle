"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Sparkles, Zap } from "lucide-react";
import { arcThemeFromPath } from "@/components/layout/arc-theme-sync";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prism", label: "PRISM", icon: Radar },
  { href: "/nexus", label: "NEXUS", icon: Zap },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  if (pathname === "/nexus") return null;

  const activeStyles = {
    home: "bg-violet-500/20 text-violet-100",
    nexus: "bg-emerald-500/20 text-emerald-100",
    prism: "bg-amber-500/20 text-amber-100",
  };

  const iconActive = {
    home: "text-violet-300",
    nexus: "text-emerald-300",
    prism: "text-amber-300",
  };

  return (
    <nav
      className="arc-nav-glass fixed bottom-3 left-3 right-3 z-[90] rounded-2xl pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-2 py-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const tabTheme = href === "/nexus" ? "nexus" : href === "/prism" ? "prism" : "home";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[52px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition active:scale-95",
                active ? activeStyles[tabTheme] : "text-white/50 hover:text-white/80",
              )}
              data-cursor-hover
            >
              <Icon className={cn("h-5 w-5", active && iconActive[tabTheme])} />
              {label}
            </Link>
          );
        })}
        <a
          href="https://faucet.circle.com/"
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[52px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-white/50 transition hover:text-white/80 active:scale-95"
          data-cursor-hover
        >
          <Sparkles className="h-5 w-5" />
          Faucet
        </a>
      </div>
    </nav>
  );
}
