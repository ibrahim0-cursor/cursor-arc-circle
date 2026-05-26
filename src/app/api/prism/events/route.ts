import { NextResponse } from "next/server";
import { listPrismEvents } from "@/lib/prism-agent";

export async function GET() {
  return NextResponse.json(listPrismEvents());
}
