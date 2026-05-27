"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PORTAL_LOGOS } from "@/lib/portal-token-logos";
import type { PortalTokenId } from "@/lib/portal-tokens";

export function usePortalTokenLogos() {
  const [logos, setLogos] = useState<Record<PortalTokenId, string>>(DEFAULT_PORTAL_LOGOS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market/token-logos")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<PortalTokenId, string> | null) => {
        if (!cancelled && data) setLogos(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return logos;
}
