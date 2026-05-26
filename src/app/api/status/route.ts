import { NextResponse } from "next/server";
import { getArcStatus } from "@/lib/arc";
import { getCircleStatus } from "@/lib/circle";

export async function GET() {
  const [arc, circle] = await Promise.all([getArcStatus(), getCircleStatus()]);
  return NextResponse.json({ arc, circle });
}
