"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type ArcTheme = "home" | "nexus" | "prism";

export function arcThemeFromPath(pathname: string): ArcTheme {
  if (pathname.startsWith("/nexus")) return "nexus";
  if (pathname.startsWith("/prism")) return "prism";
  return "home";
}

/** Syncs route → document theme for cursor, glass, and ambient CSS */
export function ArcThemeSync() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);

  useEffect(() => {
    document.documentElement.setAttribute("data-arc-theme", theme);
    return () => {
      document.documentElement.removeAttribute("data-arc-theme");
    };
  }, [theme]);

  return null;
}
