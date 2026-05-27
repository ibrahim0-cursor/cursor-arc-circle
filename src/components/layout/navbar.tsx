"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArcLogoMark } from "@/components/layout/arc-logo-mark";
import { arcThemeFromPath } from "@/components/layout/arc-theme-sync";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";

const links = [
  { href: "/", label: "Home" },
  { href: "/nexus", label: "NEXUS" },
  { href: "/prism", label: "PRISM" },
  { href: "https://faucet.circle.com/", label: "Faucet", external: true },
];

export function Navbar() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  const ctaClass =
    theme === "nexus"
      ? "bg-[var(--nexus-accent)] text-[#021a12] hover:brightness-110"
      : theme === "prism"
        ? "bg-[var(--prism-amber)] text-[#1a0c00] hover:brightness-110"
        : "bg-white text-black hover:bg-white/90";

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="arc-nav-glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 sm:h-[60px] sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5" data-cursor-hover>
          <ArcLogoMark className="h-9 w-9" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-[0.14em] text-white/92">ARC CIRCLE</p>
            <p className="arc-caption text-[9px] text-white/45">Intelligence OS</p>
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
                className="rounded-full px-4 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white"
                data-cursor-hover
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-all",
                  pathname === link.href
                    ? "arc-nav-pill-active font-medium"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
                data-cursor-hover
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={theme === "prism" ? "/prism" : "/nexus"}
            className={cn("arc-btn-pill hidden rounded-full px-4 py-2 text-sm font-semibold transition sm:inline-block", ctaClass)}
            data-cursor-hover
          >
            Get started
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
