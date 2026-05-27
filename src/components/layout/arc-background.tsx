"use client";

/** ARC intelligence atmosphere — matte depth, subtle grid, no heavy glassmorphism */
export function ArcBackground({ theme = "home" }: { theme?: "home" | "nexus" | "prism" }) {
  const accent =
    theme === "nexus"
      ? "rgba(16, 185, 129, 0.08)"
      : theme === "prism"
        ? "rgba(217, 119, 6, 0.07)"
        : "rgba(34, 211, 238, 0.06)";

  const accent2 =
    theme === "nexus"
      ? "rgba(34, 211, 238, 0.05)"
      : theme === "prism"
        ? "rgba(124, 58, 237, 0.05)"
        : "rgba(99, 102, 241, 0.05)";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" data-arc-theme={theme}>
      <div className="absolute inset-0" style={{ background: "var(--arc-bg, #060608)" }} />
      <div className="arc-grid-bg absolute inset-0 opacity-60" />
      <div
        className="absolute -left-1/4 top-0 h-[50vh] w-[50vw] rounded-full opacity-100"
        style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[40vh] w-[45vw] rounded-full"
        style={{ background: `radial-gradient(circle, ${accent2} 0%, transparent 72%)` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.2),transparent_25%,rgba(0,0,0,0.5))]" />
      {theme === "prism" && (
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(217,119,6,0.15) 41px, transparent 42px)`,
          }}
        />
      )}
    </div>
  );
}
