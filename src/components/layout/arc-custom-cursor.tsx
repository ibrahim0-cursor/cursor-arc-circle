"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Premium iridescent pointer — desktop only, respects reduced motion.
 * Inspired by glass / prism cursor references (no default OS arrow).
 */
export function ArcCustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const hoveringRef = useRef(false);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduced) return;

    setEnabled(true);
    document.documentElement.classList.add("arc-custom-cursor-active");

    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      hoveringRef.current = !!el?.closest(
        "a, button, [role='button'], input, select, textarea, label, [data-cursor-hover]",
      );
    };

    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18;
      pos.current.y += (target.current.y - pos.current.y) * 0.18;
      const { x, y } = pos.current;
      const scale = hoveringRef.current ? 1.55 : 1;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("arc-custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="arc-cursor-ring" aria-hidden />
      <div ref={dotRef} className="arc-cursor-dot" aria-hidden />
    </>
  );
}
