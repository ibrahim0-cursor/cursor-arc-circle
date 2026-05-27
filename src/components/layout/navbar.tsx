"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArcLogoMark } from "@/components/layout/arc-logo-mark";
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

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="arc-nav-glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl px-4 sm:h-[60px] sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5" data-cursor-hover>
          <ArcLogoMark className="h-9 w-9" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-[0.14em] text-white/92">ARC CIRCLE</p>
            <p className="arc-caption text-[9px] text-violet-300/60">Intelligence OS</p>
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
            href="/nexus"
            className="arc-btn-pill hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 sm:inline-block"
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
