import { NextResponse } from "next/server";
import { getPrismPredictions } from "@/lib/storage";

export async function GET() {
  const predictions = await getPrismPredictions(30);
  return NextResponse.json(predictions);
}
