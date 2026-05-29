import { dexChainIdToGmgn, gmgnKolHolders, gmgnSmartMoneyHolders } from "./gmgn-analytics";
import { hasGmgnApiKey } from "./gmgn-client";

export type CopyTradeWallet = {
  address: string;
  note: string;
  source: "gmgn";
  winRate?: number;
};

export type CopyTradeBuildResult = {
  wallets: CopyTradeWallet[];
  statusNote: string;
};

const MIN_WIN_RATE = 70;

type GmgnWalletRow = {
  address: string;
  winRate?: number;
  profitUsd?: number;
  label?: string;
  tag?: string;
  from: "kol" | "smart";
};

function extractList(data: unknown): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  for (const key of ["list", "data", "holders", "rank", "items", "result"]) {
    const v = d[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

function parseGmgnWalletRows(data: unknown, from: "kol" | "smart"): GmgnWalletRow[] {
  return extractList(data).map((r, i) => {
    const address = String(
      r.address ?? r.wallet_address ?? r.owner ?? r.account ?? `unknown-${i}`,
    );
    let winRate = Number(
      r.win_rate ??
        r.winrate ??
        r.win_rate_7d ??
        r.win_rate_30d ??
        r.success_rate ??
        r.win_percent ??
        NaN,
    );
    if (winRate > 0 && winRate <= 1) winRate *= 100;
    const profitUsd = Number(
      r.realized_profit ??
        r.realized_profit_7d ??
        r.realized_profit_30d ??
        r.profit ??
        r.pnl ??
        r.total_profit ??
        r.profit_usd ??
        NaN,
    );
    const tag = r.tag ?? r.tags ?? r.wallet_tag;
    const label =
      typeof tag === "string"
        ? tag
        : Array.isArray(tag)
          ? tag.join(", ")
          : typeof r.name === "string"
            ? r.name
            : typeof r.remark === "string"
              ? r.remark
              : undefined;
    return {
      address,
      winRate: Number.isFinite(winRate) ? winRate : undefined,
      profitUsd: Number.isFinite(profitUsd) ? profitUsd : undefined,
      label,
      tag: label,
      from,
    };
  });
}

/** Smart-money / KOL lists from GMGN; ≥70% win rate when API returns it. */
function qualifies(row: GmgnWalletRow): boolean {
  if (row.address.startsWith("unknown")) return false;
  if (row.winRate != null) {
    if (row.winRate >= MIN_WIN_RATE) return true;
    if (row.winRate < 45) return false;
  }
  if (row.from === "smart") return true;
  const tag = `${row.tag ?? ""} ${row.label ?? ""}`.toLowerCase();
  if (row.from === "kol" && /renowned|kol|degen|smart|bundler|snipe/.test(tag)) return true;
  if (row.profitUsd != null && row.profitUsd > 500) return true;
  return false;
}

function formatNote(row: GmgnWalletRow): string {
  const parts: string[] = [];
  if (row.winRate != null) {
    parts.push(
      row.winRate >= MIN_WIN_RATE
        ? `${row.winRate.toFixed(0)}% win rate`
        : `${row.winRate.toFixed(0)}% win (GMGN)`,
    );
  }
  if (row.profitUsd != null && row.profitUsd > 0) {
    parts.push(
      row.profitUsd >= 1_000_000
        ? `$${(row.profitUsd / 1_000_000).toFixed(2)}M realized`
        : row.profitUsd >= 1000
          ? `$${(row.profitUsd / 1000).toFixed(1)}K realized`
          : `$${row.profitUsd.toFixed(0)} realized`,
    );
  }
  if (row.label) parts.push(row.label);
  parts.push(row.from === "smart" ? "GMGN smart money" : "GMGN KOL");
  return parts.join(" · ");
}

export async function buildProfitableCopyTradeWallets(
  chainId: string,
  tokenAddress: string,
  limit = 6,
): Promise<CopyTradeBuildResult> {
  if (!hasGmgnApiKey()) {
    return {
      wallets: [],
      statusNote: "GMGN_API_KEY not visible on server — save in Vercel Production env and redeploy.",
    };
  }
  const chain = dexChainIdToGmgn(chainId);
  if (!chain) {
    return {
      wallets: [],
      statusNote: `GMGN supports Sol · Base · BSC · ETH only (this pair is ${chainId}).`,
    };
  }

  const [kol, smart] = await Promise.all([
    gmgnKolHolders(chain, tokenAddress, 24),
    gmgnSmartMoneyHolders(chain, tokenAddress, 24),
  ]);

  const errors: string[] = [];
  if (!kol.ok) errors.push(`KOL: ${kol.error ?? "failed"}`);
  if (!smart.ok) errors.push(`Smart: ${smart.error ?? "failed"}`);

  const merged = new Map<string, GmgnWalletRow>();
  if (kol.ok) {
    for (const row of parseGmgnWalletRows(kol.data, "kol")) {
      if (!row.address.startsWith("unknown")) merged.set(row.address.toLowerCase(), row);
    }
  }
  if (smart.ok) {
    for (const row of parseGmgnWalletRows(smart.data, "smart")) {
      if (!row.address.startsWith("unknown")) merged.set(row.address.toLowerCase(), row);
    }
  }

  const wallets = [...merged.values()]
    .filter(qualifies)
    .sort(
      (a, b) =>
        (b.winRate ?? 0) - (a.winRate ?? 0) || (b.profitUsd ?? 0) - (a.profitUsd ?? 0),
    )
    .slice(0, limit)
    .map((row) => ({
      address: row.address,
      note: formatNote(row),
      source: "gmgn" as const,
      winRate: row.winRate,
    }));

  if (wallets.length > 0) {
    return {
      wallets,
      statusNote: `GMGN live · ${wallets.length} smart-money / KOL wallet${wallets.length > 1 ? "s" : ""} on ${chain.toUpperCase()}.`,
    };
  }
  if (errors.length > 0) {
    return {
      wallets: [],
      statusNote: `GMGN key set but no wallets for this mint (${errors.join("; ")}).`,
    };
  }
  return {
    wallets: [],
    statusNote:
      "GMGN connected — no smart-money / KOL holders on this pair right now (try a Sol meme with active GMGN tags).",
  };
}

/** @deprecated use buildProfitableCopyTradeWallets */
export async function buildProfitableCopyTradeWalletsList(
  chainId: string,
  tokenAddress: string,
  limit = 6,
): Promise<CopyTradeWallet[]> {
  const r = await buildProfitableCopyTradeWallets(chainId, tokenAddress, limit);
  return r.wallets;
}
