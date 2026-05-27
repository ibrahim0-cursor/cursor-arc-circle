"use client";

import Image from "next/image";
import { TOKEN_BRAND, type CryptoId } from "@/components/landing/arc-crypto-icons";
import { ArcCryptoIcon } from "@/components/landing/arc-crypto-icons";
import type { PortalTokenId } from "@/lib/portal-tokens";
import { cn } from "@/lib/utils";

const sizePx = { sm: 44, md: 52, lg: 64, xl: 76 } as const;

type TokenId = CryptoId | PortalTokenId;

/** Premium 3D planet coin — CoinGecko logo on metallic disc */
export function ArcToken3d({
  id,
  size = "md",
  className,
  style,
  logoSrc,
  planet = false,
}: {
  id: TokenId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  style?: React.CSSProperties;
  logoSrc?: string;
  planet?: boolean;
}) {
  const brand = TOKEN_BRAND[id as CryptoId];
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
      <div className="arc-token-3d-halo" />
      <div className="arc-token-3d-shadow" />
      <div className="arc-token-3d-rim-back" />
      <div className="arc-token-3d-rim" />
      <div className="arc-token-3d-face">
        <div className="arc-token-3d-shine" />
        {logoSrc ? (
          <Image
            src={logoSrc}
            alt=""
            width={dim - 12}
            height={dim - 12}
            unoptimized={isRemote}
            className="arc-token-3d-logo object-contain"
            priority={size === "xl" || size === "lg"}
          />
        ) : (
          <ArcCryptoIcon
            id={id as CryptoId}
            size={size === "xl" || size === "lg" ? "lg" : size === "sm" ? "sm" : "md"}
          />
        )}
      </div>
    </div>
  );
}
