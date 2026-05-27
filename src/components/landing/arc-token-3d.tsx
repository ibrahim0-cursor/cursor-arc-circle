"use client";

import { ArcCryptoIcon, type CryptoId } from "@/components/landing/arc-crypto-icons";
import { cn } from "@/lib/utils";

/** 3D coin disc for portal animation */
export function ArcToken3d({
  id,
  className,
  style,
}: {
  id: CryptoId;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("arc-token-3d", className)} style={style}>
      <div className="arc-token-3d-edge" />
      <div className="arc-token-3d-face">
        <ArcCryptoIcon id={id} size="md" />
      </div>
    </div>
  );
}
