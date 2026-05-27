"use client";

import { ArcCryptoIcon, TOKEN_BRAND, type CryptoId } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

/** Premium 3D coin with brand rim and specular face */
export function ArcToken3d({
  id,
  size = "md",
  className,
  style,
  processed = false,
}: {
  id: CryptoId;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  processed?: boolean;
}) {
  const brand = TOKEN_BRAND[id];
  const dim = size === "lg" ? 56 : size === "sm" ? 40 : 48;

  return (
    <div
      className={cn("arc-token-3d", processed && "arc-token-3d-processed", className)}
      style={
        {
          ...style,
          width: dim,
          height: dim,
          "--token-rim": brand.rim,
          "--token-glow": brand.glow,
        } as React.CSSProperties
      }
    >
      <div className="arc-token-3d-shadow" />
      <div className="arc-token-3d-rim" />
      <div className="arc-token-3d-face">
        <div className="arc-token-3d-shine" />
        <ArcCryptoIcon id={id} size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
      </div>
    </div>
  );
}
