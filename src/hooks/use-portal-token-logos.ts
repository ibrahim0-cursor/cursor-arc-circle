"use client";

import { useEffect, useState } from "react";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";
import { DEFAULT_PORTAL_LOGOS } from "@/lib/portal-token-logos";

export function usePortalTokenLogos() {
  const [logos, setLogos] = useState<Record<CryptoId, string>>(DEFAULT_PORTAL_LOGOS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market/token-logos")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<CryptoId, string> | null) => {
        if (!cancelled && data) setLogos(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return logos;
}
