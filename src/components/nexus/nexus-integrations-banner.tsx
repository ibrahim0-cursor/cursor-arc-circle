"use client";

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useIntegrationsStatus } from "@/hooks/use-integrations-status";

export function NexusIntegrationsBanner() {
  const { status, loading, refresh } = useIntegrationsStatus();

  if (loading && !status) {
    return (
      <div className="arc-glass-card arc-glass-card-nexus flex items-center gap-2 px-3 py-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
        Checking market data APIs…
      </div>
    );
  }

  if (!status) return null;

  const birdeyeOk = status.birdeye && status.birdeyeProbe.ok;
  const birdeyeKeyMissing = !status.birdeye;
  const birdeyeKeyBad = status.birdeye && !status.birdeyeProbe.ok;
  const birdeyeQuota =
    birdeyeKeyBad &&
    /quota|compute units|usage limit|rate limit/i.test(status.birdeyeProbe.error ?? "");

  const gmgnOk = Boolean(status.gmgn && status.gmgnProbe?.ok);
  const gmgnKeyOnly = Boolean(status.gmgn && !status.gmgnProbe?.ok);
  const news6551Ok = Boolean(status.opennews && status.opennewsProbe?.configured);
  const news6551Live = Boolean(status.opennews && status.opennewsProbe?.ok);
  const news6551KeyOnly = Boolean(status.opennews && status.opennewsProbe?.configured && !status.opennewsProbe?.ok);
  const news6551Rotated = /refreshed|new token/i.test(status.opennewsProbe?.error ?? "");
  const news6551Quota = /insufficient quota|quota exceeded|daily quota/i.test(
    status.opennewsProbe?.error ?? "",
  );
  const gmgnRateLimited = /rate limit|rate limited|429|cooldown|slow or rate/i.test(
    status.gmgnProbe?.error ?? "",
  );
  const gmgnProbeSlow = /probe timeout|skipped in quick|keys set — full/i.test(
    status.gmgnProbe?.error ?? "",
  );
  const keysConfigured =
    Boolean(status.gmgn) &&
    news6551Ok &&
    (birdeyeKeyMissing || birdeyeKeyBad || gmgnKeyOnly || news6551KeyOnly);
  const limitsOnly =
    keysConfigured &&
    (news6551Quota || gmgnRateLimited || birdeyeQuota) &&
    !news6551Rotated &&
    !/invalid|expired|rejected|rotated/i.test(
      [
        status.birdeyeProbe?.error,
        status.opennewsProbe?.error,
        status.gmgnProbe?.error,
      ]
        .filter(Boolean)
        .join(" "),
    );

  const partialWarnings: string[] = [];
  if (birdeyeKeyBad) {
    partialWarnings.push(
      birdeyeQuota
        ? "Birdeye: quota reached — snipers / whale OHLCV paused until reset"
        : `Birdeye: ${status.birdeyeProbe?.error ?? "unavailable"}`,
    );
  }
  const news6551Source = status.opennewsProbe?.tokenSource;
  if (news6551KeyOnly && !news6551Quota) {
    const sourceHint =
      news6551Source && news6551Source !== "API_KEY_6551"
        ? ` (production is using ${news6551Source} — delete it or set to the new key)`
        : news6551Source === "API_KEY_6551"
          ? " (using API_KEY_6551)"
          : "";
    partialWarnings.push(
      news6551Rotated
        ? `6551: API token was rotated — paste the NEW key from 6551.io into Vercel API_KEY_6551${sourceHint}, then redeploy`
        : `6551 news/X: ${status.opennewsProbe?.error ?? "not returning headlines"}${sourceHint}`,
    );
  }
  if (gmgnKeyOnly && !gmgnProbeSlow) {
    partialWarnings.push(
      gmgnRateLimited
        ? `GMGN: rate limit (key OK) — Live Feed still uses Dex; GMGN refreshes when limit clears`
        : `GMGN: ${status.gmgnProbe?.error ?? "pending"}`,
    );
  }

  if (birdeyeOk || gmgnOk || news6551Live) {
    return (
      <div className="mb-3 space-y-2">
        <div className="arc-glass-card arc-glass-card-nexus flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            <span>
              <strong className="font-semibold">Live intel connected</strong>
              <span className="text-emerald-200/80">
                {birdeyeOk && gmgnOk && news6551Live
                  ? " — Birdeye · GMGN · 6551 news"
                  : birdeyeOk && gmgnOk
                    ? " — Birdeye · GMGN"
                    : gmgnOk && news6551Live
                      ? " — GMGN · 6551 news"
                      : gmgnOk
                        ? " — GMGN copy-trade & smart-money (working)"
                        : birdeyeOk
                          ? " — Birdeye"
                          : " — 6551 OpenNews"}
              </span>
            </span>
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
        {news6551Quota && (
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/55">
            6551 news quota paused (key valid) — resets on 6551.io; Live Feed and Birdeye intel are unaffected.
          </p>
        )}
        {partialWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/[0.1] px-3 py-2.5 text-xs leading-relaxed text-amber-100/90">
            <p className="font-semibold text-amber-50">Also needs attention</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1">
              {partialWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (limitsOnly) {
    return (
      <div className="mb-3 space-y-2">
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/[0.08] px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-cyan-50">
              <strong>API keys connected on Vercel</strong>
              <span className="text-cyan-100/85">
                {" "}
                — some providers hit daily or rate limits. NEXUS still runs on Dex, Gecko, and agent logic.
              </span>
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recheck
            </button>
          </div>
          {partialWarnings.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-cyan-100/80">
              {partialWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  if (gmgnKeyOnly || news6551KeyOnly || (status.gmgn && status.birdeye)) {
    return (
      <div className="mb-3 rounded-xl border border-amber-400/35 bg-amber-500/[0.1] px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-amber-50">
            <strong>{news6551Rotated || /invalid|expired/i.test(status.birdeyeProbe?.error ?? "") ? "Fix API keys on Vercel" : "API keys saved on Vercel"}</strong>
            <span className="text-amber-100/85">
              {gmgnKeyOnly && !partialWarnings.some((w) => w.startsWith("GMGN")) ? ` — GMGN: ${status.gmgnProbe?.error ?? "pending"}` : ""}
              {news6551KeyOnly && !partialWarnings.some((w) => w.startsWith("6551"))
                ? ` — 6551: ${status.opennewsProbe?.error ?? "no rows yet"}${news6551Source ? ` [${news6551Source}]` : ""}`
                : ""}
              {birdeyeKeyBad ? ` — Birdeye: ${status.birdeyeProbe?.error ?? "check key"}` : ""}
              {!gmgnKeyOnly && !news6551KeyOnly && !birdeyeKeyBad ? " — finishing handshake" : ""}
            </span>
            <span className="mt-1 block text-xs text-amber-100/70">
              {news6551Rotated || /invalid|expired/i.test(status.birdeyeProbe?.error ?? "")
                ? "Update the key on 6551.io or bds.birdeye.so, save in Vercel Production, then Redeploy → Production and hard-refresh /nexus."
                : "If you just changed keys: Redeploy → Production (not only Save), then hard-refresh /nexus."}
            </span>
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/25 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recheck
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        birdeyeKeyMissing || birdeyeQuota
          ? "border-amber-400/35 bg-amber-500/[0.1]"
          : "border-rose-400/30 bg-rose-500/[0.08]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex gap-2">
          <AlertCircle
            className={`mt-0.5 h-5 w-5 shrink-0 ${birdeyeKeyMissing || birdeyeQuota ? "text-amber-300" : "text-rose-300"}`}
          />
          <div className="space-y-1 text-sm">
            {birdeyeKeyMissing ? (
              <>
                <p className="font-semibold text-amber-50">Birdeye not on Production</p>
                <p className="leading-relaxed text-amber-100/85">
                  Add <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-xs text-amber-50">BIRDEYE_API_KEY</code> in{" "}
                  <strong>Vercel → Environment Variables → Production</strong> (not Development only), then <strong>Redeploy Production</strong>.
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
            ) : birdeyeQuota ? (
              <>
                <p className="font-semibold text-amber-50">Whale data temporarily limited</p>
                <p className="leading-relaxed text-amber-100/85">
                  {status.birdeyeProbe.error ??
                    "Birdeye quota reached — scans still run on live market and signal data."}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-rose-50">Market data key needs attention</p>
                <p className="leading-relaxed text-rose-100/85">
                  {status.birdeyeProbe.error ??
                    "Update BIRDEYE_API_KEY in Vercel → Environment Variables, then redeploy."}
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
      <p className="mt-2 text-xs text-white/55">
        {status.socialStack === "premium" ? (
          <>
            <span className="font-medium text-white/70">Social APIs (premium)</span>
            {" · "}
            LC {status.lunarcrushProbe?.ok ? "ok" : status.lunarcrush ? "limited" : "off"}
            {" · "}
            Neynar {status.neynarProbe?.ok ? "ok" : status.neynar ? "limited" : "off"}
            {" · "}
            Reddit {status.redditProbe?.ok ? "ok" : status.reddit ? "pending" : "off"}
          </>
        ) : (
          <>
            <span className="font-medium text-emerald-200/90">Free intel mode</span>
            {" — 6-layer Alpha (narrative, smart money, momentum, risk, AI thesis). "}
            TG {status.telegramProbe?.ok ? "ok" : status.telegram ? "…" : "off"}
            {" · "}
            DC {status.discordProbe?.ok ? "ok" : status.discordBot ? "needs guild IDs" : "off"}
            {" · "}
            ST {status.stocktwitsProbe?.ok ? "ok" : status.stocktwits ? "…" : "off"}
            {" · "}
            X {status.socialDataProbe?.ok ? "SD ok" : status.socialData ? "SD …" : status.rapidTwitterProbe?.ok ? "ok" : "off"}
            {" · "}
            GitHub {status.github ? "on" : "off"}. Reddit when approved.
          </>
        )}
      </p>
    </div>
  );
}
