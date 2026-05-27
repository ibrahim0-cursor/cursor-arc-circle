"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Home, Radar, Sparkles, Zap } from "lucide-react";
import { ArcLogoMark } from "@/components/layout/arc-logo-mark";
import { arcThemeFromPath } from "@/components/layout/arc-theme-sync";
import { ArcIcon3d } from "@/components/ui/arc-icon-3d";
import { ArcIconBadge } from "@/components/ui/arc-icon-badge";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NexusWalletMenu } from "@/components/nexus/nexus-wallet-menu";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/nexus", label: "NEXUS", icon: Zap },
  { href: "/prism", label: "PRISM", icon: Radar },
  { href: "https://faucet.circle.com/", label: "Faucet", icon: Droplets, external: true },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  const ctaClass =
    theme === "nexus"
      ? "bg-[var(--nexus-accent)] text-[#021a12] hover:brightness-110"
      : theme === "prism"
        ? "bg-[var(--prism-amber)] text-[#1a0c00] hover:brightness-110"
        : "bg-white text-black hover:bg-white/90";

  const badgeTheme = theme === "home" ? "home" : theme;

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="arc-nav-glass mx-auto flex h-[62px] max-w-5xl items-center justify-between rounded-2xl px-3 sm:px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <ArcLogoMark className="h-10 w-10" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold tracking-[0.12em] text-white">ARC CIRCLE</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">Intelligence OS</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            if ("external" in link && link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              );
            }
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-all",
                  active ? "arc-nav-pill-active font-semibold" : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                {theme === "home" ? (
                  <ArcIcon3d
                    icon={Icon}
                    theme={
                      link.href === "/nexus" ? "nexus" : link.href === "/prism" ? "prism" : "home"
                    }
                    size="sm"
                    className="!h-7 !w-7"
                  />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {theme === "nexus" ? (
            <NexusWalletMenu />
          ) : (
            <>
              {theme === "home" ? (
                <ArcIcon3d icon={Sparkles} theme="home" size="sm" className="hidden lg:flex" />
              ) : (
                <ArcIconBadge
                  icon={theme === "prism" ? Radar : Home}
                  theme={badgeTheme}
                  size="sm"
                  className="hidden lg:flex"
                />
              )}
              <Link
                href={theme === "prism" ? "/prism" : "/nexus"}
                className={cn(
                  "arc-btn-pill hidden rounded-full px-4 py-2 text-sm font-bold transition sm:inline-block",
                  ctaClass,
                )}
              >
                Get started
              </Link>
            </>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
