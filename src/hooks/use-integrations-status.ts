"use client";

import { useCallback, useEffect, useState } from "react";

export type IntegrationsStatus = {
  birdeye: boolean;
  birdeyeProbe: { ok: boolean; error?: string };
  openai: boolean;
  mode: string;
};

export function useIntegrationsStatus() {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/status?t=${Date.now()}`);
      if (res.ok) setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
