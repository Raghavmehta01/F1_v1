import { getSessionsWithStatus } from "@/lib/openf1-live";
import { currentSeason, parseSeason } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const season =
    parseSeason(req.nextUrl.searchParams.get("season")) ?? currentSeason();
  try {
    const sessions = await getSessionsWithStatus(season);
    return NextResponse.json({ season, sessions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load sessions" },
      { status: 502 },
    );
  }
}
