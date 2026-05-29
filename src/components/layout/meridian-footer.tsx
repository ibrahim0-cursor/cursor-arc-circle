import { MERIDIAN_FOOTER_LINE, MERIDIAN_NAME } from "@/lib/meridian-brand";

/** Subtitle / legal attribution — ARC Circle stays client-only. */
export function MeridianFooter({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[10px] uppercase tracking-[0.14em] text-white/35 ${className}`}>
      {MERIDIAN_NAME} · {MERIDIAN_FOOTER_LINE}
    </p>
  );
}
