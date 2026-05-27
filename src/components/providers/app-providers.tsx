"use client";

import { ArcCustomCursor } from "@/components/layout/arc-custom-cursor";
import { ArcThemeSync } from "@/components/layout/arc-theme-sync";
import { ToastProvider } from "@/components/ui/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ArcThemeSync />
      <ArcCustomCursor />
      {children}
    </ToastProvider>
  );
}
