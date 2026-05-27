"use client";

import { ArcCustomCursor } from "@/components/layout/arc-custom-cursor";
import { ArcThemeSync } from "@/components/layout/arc-theme-sync";
import { ToastProvider } from "@/components/ui/toast-provider";
import { Web3Provider } from "@/components/providers/web3-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <ToastProvider>
        <ArcThemeSync />
        <ArcCustomCursor />
        {children}
      </ToastProvider>
    </Web3Provider>
  );
}
