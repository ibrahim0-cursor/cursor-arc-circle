"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Droplets, Home, LineChart, Menu, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/prism", label: "PRISM", icon: LineChart },
  { href: "/nexus", label: "NEXUS", icon: Zap },
  { href: "https://faucet.circle.com/", label: "Faucet", icon: Droplets, external: true },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="rounded-xl border-2 border-cyan-400/40 bg-cyan-500/15 p-2.5 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[120]">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-[min(100%,280px)] flex-col border-l border-white/10 bg-[#0a0a12] p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-widest text-white">ARC CIRCLE</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              const active = !("external" in link) && pathname === link.href;
              const className = cn(
                "mb-2 flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium",
                active ? "bg-violet-500/20 text-violet-100" : "text-white/80 hover:bg-white/10",
              );
              if ("external" in link && link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className={className}
                  >
                    <Icon className="h-5 w-5 text-cyan-300" />
                    {link.label}
                  </a>
                );
              }
              return (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={className}>
                  <Icon className={cn("h-5 w-5", active ? "text-cyan-300" : "text-white/50")} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
