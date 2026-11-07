import {
  getSessionsWithStatus,
  resolveOpenF1Season,
} from "@/lib/data/openf1-live";
import { parseSeason } from "@/lib/security/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const hinted = parseSeason(req.nextUrl.searchParams.get("season"));
    const season = await resolveOpenF1Season(hinted);
    const sessions = await getSessionsWithStatus(season);
    return NextResponse.json(
      { season, sessions, source: "openf1" },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load sessions" },
      { status: 502 },
    );
  }
}
