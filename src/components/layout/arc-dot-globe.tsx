"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number };

function buildSphere(count: number, radius: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    pts.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
    });
  }
  return pts;
}

/** Sellix-style dot-matrix globe — no solid sphere / no floating balls */
export function ArcDotGlobe({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let rotY = 0;
    let rotX = 0.35;
    const points = buildSphere(720, 1);
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      rotY += 0.0032;
      rotX = 0.32 + Math.sin(rotY * 0.4) * 0.06;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.38;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      for (const p of points) {
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;
        if (z2 < -0.15) continue;
        const depth = (z2 + 1) / 2;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;
        const r = 0.6 + depth * 1.4;
        const alpha = 0.15 + depth * 0.75;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
        g.addColorStop(0, `rgba(192, 132, 252, ${alpha})`);
        g.addColorStop(0.5, `rgba(139, 92, 246, ${alpha * 0.6})`);
        g.addColorStop(1, "rgba(139, 92, 246, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`arc-dot-globe-wrap ${className}`} aria-hidden>
      <div className="arc-dot-globe-glow" />
      <canvas ref={canvasRef} className="arc-dot-globe-canvas" />
      <div className="arc-dot-globe-orbit" />
    </div>
  );
}
