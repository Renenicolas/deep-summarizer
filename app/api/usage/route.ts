import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usage";

export async function GET() {
  try {
    const stats = await getUsageStats();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load usage" },
      { status: 500 }
    );
  }
}
