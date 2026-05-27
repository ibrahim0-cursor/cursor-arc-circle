"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type CryptoId = "btc" | "eth" | "sol" | "usdc" | "usdt";

const sizeMap = { sm: 24, md: 32, lg: 40 };

/** Brand-accurate token marks (SVG, no text labels) */
export function ArcCryptoIcon({
  id,
  size = "md",
  className,
}: {
  id: CryptoId;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = sizeMap[size];
  const solGrad = useId();
  const ethGrad = useId();
  const base = { width: s, height: s, className: cn("shrink-0", className), "aria-hidden": true as const };

  switch (id) {
    case "btc":
      return (
        <svg viewBox="0 0 32 32" {...base}>
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#fff"
            d="M20.9 14.5c.4-2.5-1.5-3.9-4.1-4.7l.9-3.6-2.2-.5-.9 3.5c-.5-.1-1.1-.3-1.6-.4l.9-3.6-2.2-.5-.9 3.6c-.4-.1-.8-.2-1.2-.3l-3-.7-.7 2.8s1.1.3 1.1.3c.6.2.7.5.7.9l-.7 2.9c0 0 .1 0 .2.1h-.2l-1 4.1c-.1.2-.4.5-.7.4 0 0-1.1-.3-1.1-.3l-.7 1.7 2.9.7c.5.1 1 .3 1.5.4l-.9 3.7 2.2.5.9-3.7c.5.1 1.1.3 1.6.4l-.9 3.6 2.2.5.9-3.6c2.6.5 4.5.2 5.3-2.2.6-1.7 0-2.6-1.2-3.2 1-.4 1.7-1.2 1.9-2.8zm-3.8 4.5c-.4 1.6-2.5.7-3.2.5l.5-2.3c.7.2 3 .6 2.7 1.8zm.3-4.6c-.4 1.5-2.3.7-2.9.5l.5-2.2c.6.2 2.7.5 2.4 1.7z"
          />
        </svg>
      );
    case "eth":
      return (
        <svg viewBox="0 0 32 32" {...base}>
          <defs>
            <linearGradient id={ethGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8A92B2" />
              <stop offset="100%" stopColor="#62688F" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill={`url(#${ethGrad})`} />
          <path fill="#fff" fillOpacity="0.95" d="M16.5 4L16 4v8.8l7.2 3.1L16.5 4z" />
          <path fill="#fff" fillOpacity="0.7" d="M16 12.8V28l7.5-8.6L16 12.8z" />
          <path fill="#fff" fillOpacity="0.85" d="M16 12.8L8.3 19.4 16 28V12.8z" />
          <path fill="#fff" fillOpacity="0.55" d="M16.5 4L8.8 15.9 16 12.8V4z" />
        </svg>
      );
    case "sol":
      return (
        <svg viewBox="0 0 32 32" {...base}>
          <defs>
            <linearGradient id={solGrad} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill={`url(#${solGrad})`} />
          <path
            fill="#fff"
            d="M10.2 21.8h11.6l-1.7-2.9H11.9l-1.7 2.9zm1.8-5h8l-1.7-2.9h-4.6l-1.7 2.9zm1.8-5h4.4l-1.7-2.9h-1l-1.7 2.9z"
          />
        </svg>
      );
    case "usdc":
      return (
        <svg viewBox="0 0 32 32" {...base}>
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            fill="#fff"
            d="M16 8.5c-3.4 0-5.8 1.8-5.8 4.2 0 1.9 1.3 3.1 3.4 3.5l2.6.5c1.2.3 1.6.7 1.6 1.3 0 .8-.8 1.3-2 1.3-1.3 0-2.1-.5-2.2-1.6h-2.7c.2 2.4 2 3.8 4.9 3.8 3.1 0 5-1.5 5-3.7 0-1.8-1.2-3-3.5-3.4l-2.6-.5c-1.1-.2-1.5-.6-1.5-1.2 0-.7.7-1.2 1.8-1.2 1.1 0 1.8.5 1.9 1.3h2.6c-.2 2.6-2.1 4.1-5 4.1zm-.4 9.8v2.4h-2.2v-2.4h2.2z"
          />
        </svg>
      );
    case "usdt":
      return (
        <svg viewBox="0 0 32 32" {...base}>
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#fff"
            d="M17.4 17.2c-.1 1-.9 1.5-2.2 1.7v1.3h-1.3v-1.3c-1.6-.2-2.5-.8-2.6-1.9h2c.1.5.6.9 1.3 1v-2.4c-1.6-.4-2.6-.9-2.6-2.1 0-1.3 1-2.1 2.8-2.2V9.4h1.3v1.2c1.4.1 2.3.7 2.5 1.6h-1.9c-.1-.5-.5-.8-1.3-.9v2.3c1.7.4 2.7 1 2.7 2.2 0 1.2-.9 1.9-2.4 2.1zm-1-4v2.1c.9-.1 1.4-.5 1.4-1 0-.5-.4-.8-1.4-1zm-2.1 6.1v-2.1c-1 .1-1.4.6-1.4 1.1s.4 1 1.4 1.1z"
          />
        </svg>
      );
  }
}

export const TOKEN_BRAND: Record<CryptoId, { rim: string; glow: string }> = {
  btc: { rim: "#F7931A", glow: "rgba(247, 147, 26, 0.55)" },
  eth: { rim: "#627EEA", glow: "rgba(98, 126, 234, 0.55)" },
  sol: { rim: "#14F195", glow: "rgba(20, 241, 149, 0.5)" },
  usdc: { rim: "#2775CA", glow: "rgba(39, 117, 202, 0.55)" },
  usdt: { rim: "#26A17B", glow: "rgba(38, 161, 123, 0.55)" },
};
