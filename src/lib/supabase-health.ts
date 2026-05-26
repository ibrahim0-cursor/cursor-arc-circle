import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type DemoPortfolioTableStatus = {
  configured: boolean;
  tableOk: boolean;
  error?: string;
};

/** Verifies demo_portfolios exists (required for portfolio persistence on Vercel). */
export async function probeDemoPortfolioTable(): Promise<DemoPortfolioTableStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, tableOk: false, error: "supabase env missing" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { configured: false, tableOk: false, error: "supabase client unavailable" };
  }

  const probeWallet = "__health_probe__";
  const { error: upsertError } = await supabase.from("demo_portfolios").upsert(
    {
      wallet: probeWallet,
      positions: [],
      trades: [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "wallet" },
  );

  if (upsertError) {
    const msg = upsertError.message ?? "unknown";
    const missing =
      msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("relation") ||
      msg.includes("demo_portfolios");
    return {
      configured: true,
      tableOk: false,
      error: missing ? "run supabase/schema.sql in SQL Editor" : msg,
    };
  }

  await supabase.from("demo_portfolios").delete().eq("wallet", probeWallet);

  return { configured: true, tableOk: true };
}
