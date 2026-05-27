"use client";

import { arcThemeFromPath, type ArcTheme } from "@/components/layout/arc-theme-sync";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const POINTER: Record<ArcTheme, string> = {
  home: "/cursors/pointer-home.svg",
  nexus: "/cursors/pointer-nexus.svg",
  prism: "/cursors/pointer-prism.svg",
};

/** Fancy arrow mouse pointer (SVG) — theme-colored, desktop only */
export function ArcCustomCursor() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) return;

    const url = POINTER[theme];
    const normal = `url("${url}") 8 6, auto`;
    const pointer = `url("${url}") 8 6, pointer`;

    document.documentElement.classList.add("arc-fancy-pointer");
    document.documentElement.style.setProperty("--arc-cursor-normal", normal);
    document.documentElement.style.setProperty("--arc-cursor-pointer", pointer);

    return () => {
      document.documentElement.classList.remove("arc-fancy-pointer");
      document.documentElement.style.removeProperty("--arc-cursor-normal");
      document.documentElement.style.removeProperty("--arc-cursor-pointer");
    };
  }, [theme]);

  return null;
}
