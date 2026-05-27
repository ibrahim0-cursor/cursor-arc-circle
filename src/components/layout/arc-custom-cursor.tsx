"use client";

import { useEffect, useRef, useState } from "react";
import { arcThemeFromPath } from "@/components/layout/arc-theme-sync";
import { usePathname } from "next/navigation";

/**
 * Smooth laser pointer — soft aura (lag) + diamond core (snappy).
 * Theme tint follows route: violet home · emerald NEXUS · amber PRISM.
 */
export function ArcCustomCursor() {
  const pathname = usePathname();
  const theme = arcThemeFromPath(pathname);
  const auraRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const hoveringRef = useRef(false);
  const clickingRef = useRef(false);
  const aura = useRef({ x: 0, y: 0 });
  const core = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const raf = useRef(0);

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
    const onDown = () => {
      clickingRef.current = true;
    };
    const onUp = () => {
      clickingRef.current = false;
    };

    const tick = () => {
      aura.current.x += (target.current.x - aura.current.x) * 0.11;
      aura.current.y += (target.current.y - aura.current.y) * 0.11;
      core.current.x += (target.current.x - core.current.x) * 0.32;
      core.current.y += (target.current.y - core.current.y) * 0.32;

      const hover = hoveringRef.current;
      const click = clickingRef.current;
      const auraScale = hover ? 2.2 : click ? 0.85 : 1;
      const coreScale = hover ? 1.35 : click ? 0.75 : 1;

      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${aura.current.x}px, ${aura.current.y}px, 0) translate(-50%, -50%) scale(${auraScale})`;
      }
      if (coreRef.current) {
        coreRef.current.style.transform = `translate3d(${core.current.x}px, ${core.current.y}px, 0) translate(-50%, -50%) scale(${coreScale})`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("arc-custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="arc-cursor-root" data-cursor-theme={theme} aria-hidden>
      <div ref={auraRef} className="arc-cursor-aura" />
      <div ref={coreRef} className="arc-cursor-core" />
    </div>
  );
}
