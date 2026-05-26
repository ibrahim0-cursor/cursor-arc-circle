"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastInput = {
  type?: "success" | "error" | "info";
  title: string;
  message?: string;
  durationMs?: number;
};

/** User-action toasts only — avoid `info` for passive UI (token select, refresh). */

type Toast = ToastInput & { id: number };

const ToastContext = createContext<(input: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const entry: Toast = { type: "info", ...input, id };
      setToasts((prev) => {
        const dup = prev.some(
          (t) => t.title === entry.title && t.message === entry.message && t.type === entry.type,
        );
        if (dup) return prev;
        return [...prev, entry].slice(-3);
      });
      const ms = input.durationMs ?? 5000;
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(3.75rem+env(safe-area-inset-top))] z-[250] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon =
            t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : AlertCircle;
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
                t.type === "success" && "border-emerald-400/40 bg-emerald-950/95 text-emerald-50",
                t.type === "error" && "border-rose-400/40 bg-rose-950/95 text-rose-50",
                t.type === "info" && "border-cyan-400/40 bg-[#0a1020]/95 text-cyan-50",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs opacity-90">{t.message}</p>}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg p-1 opacity-70 hover:bg-white/10 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
