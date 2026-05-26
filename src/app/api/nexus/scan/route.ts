import { NextResponse } from "next/server";
import { runNexusScan } from "@/lib/nexus-agent";

export async function POST() {
  try {
    const result = await runNexusScan(5);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scan failed" },
      { status: 500 },
    );
  }
}
