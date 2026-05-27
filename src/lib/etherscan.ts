/** Etherscan-family APIs — optional contract metadata (multi-chain). */

function cleanKey(raw?: string): string | undefined {
  const k = raw?.trim().replace(/^['"]|['"]$/g, "");
  return k && k.length >= 8 ? k : undefined;
}

export function hasEtherscanKey(): boolean {
  return Boolean(cleanKey(process.env.ETHERSCAN_API_KEY));
}

type ScanConfig = { base: string; chainid?: string };

const SCANS: Record<string, ScanConfig> = {
  ethereum: { base: "https://api.etherscan.io/api" },
  base: { base: "https://api.basescan.org/api" },
  arbitrum: { base: "https://api.arbiscan.io/api" },
};

export async function fetchContractSourceSummary(
  chainId: string,
  address: string,
): Promise<{ verified: boolean; contractName?: string } | null> {
  const key = cleanKey(process.env.ETHERSCAN_API_KEY);
  const cfg = SCANS[chainId.toLowerCase()];
  if (!key || !cfg) return null;

  try {
    const params = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address,
      apikey: key,
    });
    const res = await fetch(`${cfg.base}?${params}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: string;
      result?: Array<{ ContractName?: string; SourceCode?: string }>;
    };
    const row = json.result?.[0];
    if (!row) return null;
    const verified = Boolean(row.SourceCode && row.SourceCode.length > 2);
    return { verified, contractName: row.ContractName };
  } catch {
    return null;
  }
}

export async function probeEtherscan(): Promise<{ ok: boolean; error?: string }> {
  if (!hasEtherscanKey()) return { ok: false, error: "ETHERSCAN_API_KEY not set" };
  const r = await fetchContractSourceSummary(
    "base",
    "0x833589fcd6edb6e08f4c7c454b497ef7714d6925",
  );
  return r ? { ok: true } : { ok: false, error: "basescan request failed" };
}
