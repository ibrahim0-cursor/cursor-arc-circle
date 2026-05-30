import { getArcCounterAddress } from "@/lib/arc-counter-contract";
import { arcExplorerAddress } from "@/lib/arc-chain";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";

/** Home hero — Arc Testnet deployment status (build-time env). */
export function ArcDeployedBadge() {
  const counter = getArcCounterAddress();

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <Badge
        variant="nexus"
        className="gap-1.5 border-emerald-400/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Deployed on Arc Testnet
      </Badge>
      {counter ? (
        <a
          href={arcExplorerAddress(counter)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200/80 underline-offset-2 hover:text-emerald-100 hover:underline"
        >
          Counter contract
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-[11px] text-white/45">MERIDIAN · NEXUS · PRISM live</span>
      )}
    </div>
  );
}
