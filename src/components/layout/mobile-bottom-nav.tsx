"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radar, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prism", label: "PRISM", icon: Radar },
  { href: "/nexus", label: "NEXUS", icon: Zap },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname === "/nexus") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-[#050508]/98 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_rgba(0,0,0,0.45)] backdrop-blur-xl md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[52px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition active:scale-95",
                active
                  ? "bg-cyan-500/15 text-cyan-100"
                  : "text-white/50 hover:text-white/80",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-cyan-300")} />
              {label}
            </Link>
          );
        })}
        <a
          href="https://faucet.circle.com/"
          target="_blank"
          rel="noreferrer"
          className="flex min-h-[52px] min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-white/50 transition hover:text-white/80 active:scale-95"
        >
          <Sparkles className="h-5 w-5" />
          Faucet
        </a>
      </div>
    </nav>
  );
}
