import { getConstructorStandings } from "@/lib/jolpica";
import { currentSeason, parseSeason } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const season =
    parseSeason(req.nextUrl.searchParams.get("season")) ?? currentSeason();
  try {
    const standings = await getConstructorStandings(season);
    return NextResponse.json({ season, standings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load standings" },
      { status: 502 },
    );
  }
}
