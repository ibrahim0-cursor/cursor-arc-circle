"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useIntegrationsStatus } from "@/hooks/use-integrations-status";

export function NexusIntegrationsBanner() {
  const { status, loading, refresh } = useIntegrationsStatus();

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
        Checking market data APIs…
      </div>
    );
  }

  if (!status) return null;

  const birdeyeOk = status.birdeye && status.birdeyeProbe.ok;
  const birdeyeKeyMissing = !status.birdeye;
  const birdeyeKeyBad = status.birdeye && !status.birdeyeProbe.ok;

  if (birdeyeOk) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
          <span>
            <strong className="font-semibold">Birdeye connected</strong>
            <span className="text-emerald-200/80"> — live holders, whales &amp; swaps</span>
          </span>
        </div>
        <span className="nexus-caption text-emerald-200/60">Agent mode: {status.mode}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        birdeyeKeyMissing
          ? "border-amber-400/35 bg-amber-500/[0.1]"
          : "border-rose-400/30 bg-rose-500/[0.08]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex gap-2">
          <AlertCircle
            className={`mt-0.5 h-5 w-5 shrink-0 ${birdeyeKeyMissing ? "text-amber-300" : "text-rose-300"}`}
          />
          <div className="space-y-1 text-sm">
            {birdeyeKeyMissing ? (
              <>
                <p className="font-semibold text-amber-50">Birdeye API key not detected on server</p>
                <p className="leading-relaxed text-amber-100/85">
                  Add <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-amber-50">BIRDEYE_API_KEY</code> in{" "}
                  <strong>Vercel → Settings → Environment Variables</strong> (or <code className="rounded bg-black/30 px-1 font-mono text-xs">.env.local</code> for local dev), then <strong>redeploy</strong>.
                </p>
                <p className="nexus-muted text-amber-100/70">
                  Get a free key at{" "}
                  <a
                    href="https://bds.birdeye.so"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-amber-200 underline underline-offset-2 hover:text-white"
                  >
                    bds.birdeye.so
                  </a>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-rose-50">Birdeye key present but API call failed</p>
                <p className="leading-relaxed text-rose-100/85">
                  {status.birdeyeProbe.error ?? "Check key validity or rate limits."}
                </p>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recheck
        </button>
      </div>
      {status.openai && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/55">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          OpenAI enabled for richer agent reasoning
        </p>
      )}
    </div>
  );
}
