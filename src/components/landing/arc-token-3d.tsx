"use client";

import Image from "next/image";
import { TOKEN_BRAND, type CryptoId } from "@/components/landing/arc-crypto-icons";
import { TOKEN_LOGO_SRC } from "@/components/landing/arc-token-assets";
import { cn } from "@/lib/utils";

const sizePx = { sm: 44, md: 52, lg: 64 } as const;

/** Premium 3D coin using attached brand logo textures */
export function ArcToken3d({
  id,
  size = "md",
  className,
  style,
}: {
  id: CryptoId;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}) {
  const brand = TOKEN_BRAND[id];
  const dim = sizePx[size];

  return (
    <div
      className={cn("arc-token-3d", className)}
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
        <Image
          src={TOKEN_LOGO_SRC[id]}
          alt=""
          width={dim - 10}
          height={dim - 10}
          className="arc-token-3d-logo object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
          priority={size === "lg"}
        />
      </div>
    </div>
  );
}
