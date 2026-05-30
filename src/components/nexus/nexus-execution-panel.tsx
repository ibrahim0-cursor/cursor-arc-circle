"use client";

import { Bot, Brain, Loader2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNexusAgentRuntime } from "@/components/nexus/nexus-agent-context";
import { NexusAgentWalletCard } from "@/components/nexus/nexus-agent-wallet-card";
import { estimateRequiredUsdc, loadAutopilot } from "@/lib/nexus-autopilot";
import { useAgentWallet } from "@/hooks/use-agent-wallet";

export function NexusExecutionPanel({ compact = false }: { compact?: boolean }) {
  const agent = useNexusAgentRuntime();
  const config = loadAutopilot();
  const { usdcBalance } = useAgentWallet();
  const requiredUsdc = estimateRequiredUsdc(config, usdcBalance);

  return (
    <div className="space-y-3">
      <NexusAgentWalletCard requiredUsdc={requiredUsdc} compact={false} />

      {agent.enabled ? (
        <div className="space-y-3 rounded-xl border border-rose-400/35 bg-rose-500/12 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-rose-100">
              <Bot className="h-4 w-4 animate-pulse" />
              Agent live · {agent.displaySymbol}
            </span>
            <button
              type="button"
              onClick={agent.stop}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-400/50 bg-black/30 px-3 py-1.5 text-xs font-bold text-rose-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Stop
            </button>
          </div>
          <p className="text-xs text-white/70">
            {agent.running ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Executing current signal…
              </span>
            ) : (
              <>
                Next run in <strong className="text-white">{agent.nextIn}s</strong> · vault only (no wallet
                prompts)
              </>
            )}
          </p>
          <Button
            variant="outline"
            className="min-h-[44px] w-full gap-2"
            disabled={agent.running}
            onClick={() => agent.runNow()}
          >
            <Zap className="h-4 w-4" />
            Run next trade now
          </Button>
        </div>
      ) : (
        !compact && (
          <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/55">
            Deposit USDC above, then tap <strong className="text-violet-200">Run Agent</strong> below.
          </p>
        )
      )}

      {agent.lastReasoning && (
        <div className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200/80">
            <Brain className="h-3.5 w-3.5" />
            Latest reasoning
          </p>
          <p className="text-xs leading-relaxed text-white/80">{agent.lastReasoning}</p>
        </div>
      )}

      {agent.logs.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/8 bg-black/25 p-2">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/40">Activity</p>
          {agent.logs.map((log, i) => (
            <p
              key={log.at + i}
              className={`text-[11px] ${
                log.type === "trade"
                  ? "text-emerald-300"
                  : log.type === "error"
                    ? "text-rose-300"
                    : "text-white/55"
              }`}
            >
              {new Date(log.at).toLocaleTimeString()} — {log.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
