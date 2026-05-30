import { ARC_RPC_URL_DEFAULT } from "@/lib/arc-chain";
import { MERIDIAN_FOOTER_LINE, MERIDIAN_NAME } from "@/lib/meridian-brand";

/** Subtitle / legal attribution — ARC Circle stays client-only. */
export function MeridianFooter({ className = "" }: { className?: string }) {
  const build = process.env.NEXT_PUBLIC_MERIDIAN_BUILD;
  return (
    <p className={`text-center text-[10px] uppercase tracking-[0.14em] text-white/35 ${className}`}>
      {MERIDIAN_NAME} · {MERIDIAN_FOOTER_LINE}
      <span className="mx-1 text-white/25">·</span>
      <a
        href={ARC_RPC_URL_DEFAULT}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono normal-case text-white/30 underline-offset-2 hover:text-emerald-200/70 hover:underline"
      >
        Circle RPC
      </a>
      {build && build !== "dev" ? (
        <span className="ml-2 font-mono text-white/25">· build {build}</span>
      ) : null}
    </p>
  );
}
