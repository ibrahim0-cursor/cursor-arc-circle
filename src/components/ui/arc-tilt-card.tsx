"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/** Subtle 3D tilt on hover — institutional, not gimmicky */
export function ArcTiltCard({
  children,
  className,
  depth = 14,
  glow = "var(--arc-accent)",
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  glow?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });

  const spotlight = useMotionTemplate`radial-gradient(520px circle at ${x}px ${y}px, ${glow}22, transparent 42%)`;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-py * depth);
    rotateY.set(px * depth);
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  }

  function onLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1200,
      }}
      className={cn("group arc-tilt-root relative", className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: spotlight }}
      />
      <div className="arc-tilt-inner relative" style={{ transform: "translateZ(24px)" }}>
        {children}
      </div>
    </motion.div>
  );
}
