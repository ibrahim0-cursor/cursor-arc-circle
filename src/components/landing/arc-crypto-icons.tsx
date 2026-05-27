"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export type CryptoId = "btc" | "eth" | "sol" | "usdc" | "usdt";

const sizeMap = { sm: 22, md: 28, lg: 36 };

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
  const solGradientId = useId();
  const props = { width: s, height: s, className: cn("shrink-0", className) };

  switch (id) {
    case "btc":
      return (
        <svg viewBox="0 0 32 32" {...props} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            fill="#fff"
            d="M18.8 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.9-.2-1.3-.3l.7-2.7-1.6-.4-.7 2.7c-.3-.1-.6-.1-.9-.2l-2.3-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.6.4.7-2.8c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.7c2 .3 3.5.2 4.1-1.6.5-1.4 0-2.2-1.1-2.7.8-.2 1.4-.8 1.6-2zm-2.9 4.6c-.4 1.6-2.8.7-3.6.5l.6-2.5c.8.2 3.4.6 3 1.9zm.4-4.7c-.4 1.5-2.6.7-3.3.5l.6-2.4c.7.2 3.1.5 2.7 1.9z"
          />
        </svg>
      );
    case "eth":
      return (
        <svg viewBox="0 0 32 32" {...props} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <path fill="#fff" d="M16 6v7.2l6.2 2.8L16 6zm0 9.4V26l6.3-7.3L16 15.4zM9.5 15.8 16 26V15.4 9.5 15.8zM16 6l6.2 9.6L16 13.2V6z" opacity="0.9" />
        </svg>
      );
    case "sol":
      return (
        <svg viewBox="0 0 32 32" {...props} aria-hidden>
          <defs>
            <linearGradient id={solGradientId} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill={`url(#${solGradientId})`} />
          <path fill="#fff" d="M10 20.5 16 8l6 12.5H10zm2.2-1.5h7.6L16 11.2l-3.8 7.8z" />
        </svg>
      );
    case "usdc":
      return (
        <svg viewBox="0 0 32 32" {...props} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#2775CA" />
          <path
            fill="#fff"
            d="M19.2 18.1c-.2 1.5-1.4 2.5-3.8 2.5-2.8 0-4.3-1.1-4.3-2.6 0-1.1.8-1.7 2.5-2l2.9-.6c.8-.2 1.1-.4 1.1-.9 0-.5-.5-.9-1.5-.9-1.1 0-1.6.4-1.7 1.1h-2.4c.1-1.8 1.5-2.9 4.1-2.9 2.5 0 4.1 1.1 4.1 2.7 0 1.1-.7 1.8-2.3 2.1l-2.7.6c-.9.2-1.2.5-1.2 1 0 .5.5.9 1.4.9 1 0 1.6-.4 1.7-1.1h2.4zM16 11.8c-1.4 0-2.3.8-2.4 2h-2.5c.1-2.2 1.6-3.5 4.9-3.5s4.8 1.3 4.9 3.2c0 1.4-.7 2.2-2.2 2.6l-2.2.5c-.8.2-1.1.5-1.1 1 0 .6.6 1 1.6 1 1.1 0 1.8-.5 1.9-1.3h2.4c-.2 2-1.7 3.1-4.3 3.1-3 0-4.8-1.2-4.8-3.1 0-1.3.8-2.1 2.4-2.5l2.4-.5c1-.2 1.3-.6 1.3-1.1 0-.6-.6-1-1.7-1z"
          />
        </svg>
      );
    case "usdt":
      return (
        <svg viewBox="0 0 32 32" {...props} aria-hidden>
          <circle cx="16" cy="16" r="16" fill="#26A17B" />
          <path
            fill="#fff"
            d="M17.8 17.6c-.1 1.1-.9 1.7-2.4 1.9v1.4h-1.4v-1.4c-1.8-.2-2.9-.9-3-2.2h2.3c.1.6.6 1 1.5 1.1v-2.8c-1.8-.4-3-1-3-2.4 0-1.4 1.1-2.4 3.2-2.6V9.2h1.4v1.3c1.6.2 2.7.8 2.9 1.9h-2.2c-.1-.5-.6-.9-1.5-1v2.6c1.9.4 3.1 1.1 3.1 2.5 0 1.3-1 2.2-2.8 2.5zm-1-4.2v2.3c1-.1 1.5-.5 1.5-1.1 0-.5-.4-.9-1.5-1.2zm-2.4 6.8v-2.4c-1.1.1-1.6.6-1.6 1.2 0 .7.5 1.1 1.6 1.2z"
          />
        </svg>
      );
  }
}
