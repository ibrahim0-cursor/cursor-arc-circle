"use client";

import { ArcDotGlobe } from "@/components/layout/arc-dot-globe";

/** Per-route ambient: home globe · NEXUS AI terminal · PRISM oracle rings */
export function ArcPremiumScene({
  theme = "home",
  showGlobe = false,
}: {
  theme?: "home" | "nexus" | "prism";
  showGlobe?: boolean;
}) {
  const glow =
    theme === "nexus"
      ? "rgba(129, 140, 248, 0.32)"
      : theme === "prism"
        ? "rgba(192, 132, 252, 0.32)"
        : "rgba(168, 85, 247, 0.55)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="arc-starfield absolute inset-0" />

      <div
        className={`arc-ambient-bloom absolute left-1/2 top-[6%] -translate-x-1/2 rounded-full ${theme === "prism" ? "h-[min(640px,65vh)] w-[min(820px,92vw)] blur-[90px] md:blur-[110px]" : "h-[min(780px,75vh)] w-[min(960px,98vw)] blur-[130px]"}`}
        style={{ background: `radial-gradient(ellipse at center, ${glow}, transparent 70%)` }}
      />

      {theme === "home" && showGlobe && (
        <div className="absolute left-1/2 top-[10%] h-[min(520px,52vh)] w-[min(520px,92vw)] -translate-x-1/2 opacity-90">
          <ArcDotGlobe className="h-full w-full" />
        </div>
      )}

      {theme === "nexus" && (
        <>
          <div className="arc-nexus-terminal-glow absolute inset-0" />
          <div className="arc-nexus-grid absolute inset-0 opacity-[0.32]" />
          <div className="arc-nexus-terminal-scanlines absolute inset-0" />
          <div className="arc-nexus-terminal-beam absolute bottom-[14%] left-0 right-0 h-px" />
          <div
            className="absolute inset-y-[10%] left-[18%] w-px opacity-20"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(34, 211, 238, 0.35), transparent)",
            }}
          />
          <div
            className="absolute inset-y-[10%] right-[20%] w-px opacity-15"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(129, 140, 248, 0.3), transparent)",
            }}
          />
        </>
      )}

      {theme === "prism" && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full border border-amber-400/20 arc-prism-ring-pulse ${i >= 2 ? "hidden md:block" : ""}`}
              style={{
                width: `${min(520, 260 + i * 100)}px`,
                height: `${min(520, 260 + i * 100)}px`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
          <div className="arc-prism-sweep absolute left-1/2 top-[32%] hidden h-[min(380px,45vh)] w-px origin-bottom -translate-x-1/2 bg-gradient-to-t from-amber-400/60 via-violet-300/25 to-transparent md:block" />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030405]/35 to-[#030405]" />
    </div>
  );
}

function min(a: number, b: number) {
  return a < b ? a : b;
}
