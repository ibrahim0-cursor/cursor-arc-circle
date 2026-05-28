"use client";

const nodes = [0, 1, 2, 3, 4, 5] as const;

/** Terminal status ticks — CSS pulse only (no framer on background) */
export function NexusHudLiveTouch() {
  return (
    <div
      className="nexus-hud-live-touch absolute bottom-[16%] left-[6%] right-[6%] hidden h-10 sm:block"
      aria-hidden
    >
      <div className="relative h-full overflow-hidden rounded-lg border border-cyan-500/12 bg-black/40 backdrop-blur-[6px]">
        <div className="nexus-hud-live-touch-sweep absolute inset-y-0 left-0 w-1/4" />
        <div className="relative flex h-full items-center justify-between px-4">
          {nodes.map((i) => (
            <div
              key={i}
              className="nexus-live-touch-node nexus-live-touch-node--pulse"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
