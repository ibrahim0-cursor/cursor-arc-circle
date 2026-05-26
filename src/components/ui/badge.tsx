import { cn } from "@/lib/utils";

const styles = {
  default: "bg-white/10 text-white border-white/10",
  nexus: "bg-cyan-400/10 text-cyan-200 border-cyan-400/20",
  prism: "bg-violet-400/10 text-violet-200 border-violet-400/20",
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
