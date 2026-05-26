"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function NexusCollapsible({
  label,
  hint,
  defaultOpen = false,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-xl border border-white/10 bg-black/20 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/80">{label}</p>
          {hint && !open && <p className="truncate text-[11px] text-white/45">{hint}</p>}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-white/8 px-3 py-2">{children}</div>}
    </div>
  );
}
