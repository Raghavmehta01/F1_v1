import { getSeasonCalendar } from "@/lib/data/jolpica";
import { currentSeason, parseSeason } from "@/lib/security/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const season =
    parseSeason(req.nextUrl.searchParams.get("season")) ?? currentSeason();
  try {
    const races = await getSeasonCalendar(season);
    return NextResponse.json({ season, races });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load calendar" },
      { status: 502 },
    );
  }
}
