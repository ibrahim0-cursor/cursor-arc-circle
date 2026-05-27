import { cn } from "@/lib/utils";

const styles = {
  default: "bg-white/10 text-white border-white/10",
  nexus: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30 shadow-[0_2px_12px_rgba(20,217,154,0.15)]",
  prism: "bg-amber-500/15 text-amber-100 border-amber-400/30 shadow-[0_2px_12px_rgba(245,158,11,0.15)]",
  buy: "bg-emerald-400/10 text-emerald-200 border-emerald-400/20",
  sell: "bg-rose-400/10 text-rose-200 border-rose-400/20",
  hold: "bg-amber-400/10 text-amber-200 border-amber-400/20",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
