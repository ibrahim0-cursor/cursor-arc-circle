import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "arc-btn-3d inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040506]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.12)]",
        nexus:
          "bg-gradient-to-b from-[var(--nexus-accent-bright)] to-[var(--nexus-accent)] text-[#031a12] shadow-[0_6px_0_#047857,0_12px_32px_var(--nexus-glow)] border border-emerald-300/30",
        prism:
          "bg-gradient-to-b from-[var(--prism-amber-bright)] to-[var(--prism-amber)] text-[#1c0f00] shadow-[0_6px_0_#b45309,0_12px_32px_var(--prism-glow)] border border-amber-300/30",
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
