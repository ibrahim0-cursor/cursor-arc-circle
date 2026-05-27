"use client";

import { ArcCustomCursor } from "@/components/layout/arc-custom-cursor";
import { ToastProvider } from "@/components/ui/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ArcCustomCursor />
      {children}
    </ToastProvider>
  );
}
