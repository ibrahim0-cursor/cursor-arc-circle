"use client";

export function MeshBackground({ variant = "home" }: { variant?: "home" | "nexus" | "prism" }) {
  const colors =
    variant === "nexus"
      ? ["#22d3ee", "#2563eb", "#0ea5e9"]
      : variant === "prism"
        ? ["#f59e0b", "#a78bfa", "#fb7185"]
        : ["#22d3ee", "#a78bfa", "#6366f1"];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#050508]" />
      <div
        className="absolute -left-32 top-0 h-[42rem] w-[42rem] rounded-full blur-[120px] opacity-30 animate-pulse"
        style={{ background: colors[0] }}
      />
      <div
        className="absolute right-0 top-20 h-[36rem] w-[36rem] rounded-full blur-[120px] opacity-25"
        style={{ background: colors[1] }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full blur-[120px] opacity-20"
        style={{ background: colors[2] }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_30%,rgba(0,0,0,0.35))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}
