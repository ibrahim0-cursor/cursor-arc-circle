import { NextResponse } from "next/server";
import {
  applySupabaseSchemaViaManagementApi,
  resolveSupabaseProjectRef,
} from "@/lib/supabase-schema";
import { probeSupabaseTables } from "@/lib/supabase-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorizeSetup(request: Request): boolean {
  const expected =
    process.env.SUPABASE_SETUP_SECRET?.trim() ??
    process.env.SUPABASE_SECRET_KEY?.trim()?.slice(0, 48);
  if (!expected) return false;
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-setup-key")?.trim();
  return auth === expected || header === expected;
}

export async function POST(request: Request) {
  if (!authorizeSetup(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applied = await applySupabaseSchemaViaManagementApi();
  if (!applied.ok) {
    return NextResponse.json(
      {
        error: applied.error ?? "Schema apply failed",
        projectRef: resolveSupabaseProjectRef(),
        hint: "Ensure SUPABASE_ACCESS_TOKEN is set on Vercel production",
      },
      { status: 500 },
    );
  }

  const health = await probeSupabaseTables();
  return NextResponse.json({
    ok: health.allTablesOk,
    projectRef: resolveSupabaseProjectRef(),
    tables: health.tables,
    demoPortfolio: health.demoPortfolio,
  });
}

export async function GET() {
  const health = await probeSupabaseTables();
  return NextResponse.json({
    projectRef: resolveSupabaseProjectRef(),
    hasAccessToken: Boolean(process.env.SUPABASE_ACCESS_TOKEN?.trim()),
    ...health,
  });
}
