"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";

const links = [
  { href: "/", label: "Home" },
  { href: "/prism", label: "PRISM" },
  { href: "/nexus", label: "NEXUS" },
  { href: "https://faucet.circle.com/", label: "Faucet", external: true },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050508]/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-white/90">ARC CIRCLE</p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Agent Intelligence Suite</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) =>
            "external" in link && link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm transition-colors",
                  pathname === link.href
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-200 lg:inline-flex">
            Arc Live
          </span>
          <Link
            href="https://github.com/ibrahim0-cursor/cursor-arc-circle"
            className="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 sm:inline-block"
          >
            GitHub
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
