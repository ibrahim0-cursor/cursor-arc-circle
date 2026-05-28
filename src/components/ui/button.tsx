import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "arc-btn-signal inline-flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030405]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.12)]",
        nexus:
          "bg-[var(--nexus-accent)] text-[#021a12] shadow-[0_0_28px_var(--nexus-glow)] border border-emerald-300/40",
        nexusSell:
          "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-[0_0_28px_rgba(244,63,94,0.42)] border border-rose-300/50 hover:from-rose-500 hover:to-rose-400",
        nexusSwap:
          "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-violet-50 shadow-[0_0_28px_rgba(168,85,247,0.38)] border border-violet-300/45 hover:from-violet-500 hover:to-fuchsia-500",
        nexusAutopilot:
          "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-600 text-white font-bold shadow-[0_0_32px_rgba(168,85,247,0.5)] border border-violet-300/55 hover:from-violet-400 hover:via-fuchsia-400 hover:to-violet-500",
        prism:
          "bg-[var(--prism-amber)] text-[#1a0c00] shadow-[0_0_28px_var(--prism-glow)] border border-amber-200/35",
        outline:
          "border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20",
        ghost: "text-white/70 hover:text-white hover:bg-white/5",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
