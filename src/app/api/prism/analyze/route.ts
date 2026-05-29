import { NextResponse } from "next/server";
import { runPrismAnalysis, listPrismEvents } from "@/lib/prism-agent";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      eventId?: string;
      customEvent?: string;
      arcFeeTxHash?: string;
    };
    const result = await runPrismAnalysis(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(listPrismEvents());
}
