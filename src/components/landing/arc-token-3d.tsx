"use client";

import Image from "next/image";
import { TOKEN_BRAND, type CryptoId } from "@/components/landing/arc-crypto-icons";
import { ArcCryptoIcon } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

const sizePx = { sm: 44, md: 52, lg: 64 } as const;

/** Premium 3D planet coin — CoinGecko logo texture */
export function ArcToken3d({
  id,
  size = "md",
  className,
  style,
  logoSrc,
  planet = false,
}: {
  id: CryptoId;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  logoSrc?: string;
  /** Solar-system orbit styling */
  planet?: boolean;
}) {
  const brand = TOKEN_BRAND[id];
  const dim = sizePx[size];
  const isRemote = logoSrc?.startsWith("http");

  return (
    <div
      className={cn("arc-token-3d", planet && "arc-token-3d-planet", className)}
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
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt=""
            width={dim - 8}
            height={dim - 8}
            unoptimized={isRemote}
            className="arc-token-3d-logo object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
            priority={size === "lg"}
          />
        ) : (
          <ArcCryptoIcon id={id} size={size === "lg" ? "lg" : size === "sm" ? "sm" : "md"} />
        )}
      </div>
    </div>
  );
}
