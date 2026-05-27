"use client";

/** Proprietary ARC mark — angular ring segment, not a sparkle ball */
export function ArcLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className ?? "h-10 w-10"}
      aria-hidden
    >
      <defs>
        <linearGradient id="arcMarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <path
        d="M20 4 L34 12 V28 L20 36 L6 28 V12 Z"
        fill="none"
        stroke="url(#arcMarkGrad)"
        strokeWidth="1.5"
      />
      <path d="M20 10 L28 15 V25 L20 30 L12 25 V15 Z" fill="rgba(20,217,154,0.12)" stroke="rgba(94,234,212,0.35)" strokeWidth="1" />
      <circle cx="20" cy="20" r="3" fill="#14d99a" />
    </svg>
  );
}
