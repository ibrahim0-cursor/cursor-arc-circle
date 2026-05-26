import { NextResponse } from "next/server";
import { getNexusDecisions } from "@/lib/storage";

export async function GET() {
  const decisions = await getNexusDecisions(30);
  return NextResponse.json(decisions);
}
