import { pickDefaultSession, getLiveSnapshot } from "@/lib/openf1-live";
import { clientIp, rateLimit } from "@/lib/security";
import { currentSeason, parseSeason } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limited = rateLimit(`live:${clientIp(req.headers)}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const sp = req.nextUrl.searchParams;
  const rawKey = sp.get("session_key");
  let sessionKey = rawKey ? Number.parseInt(rawKey, 10) : NaN;

  try {
    if (!Number.isFinite(sessionKey)) {
      const season = parseSeason(sp.get("season")) ?? currentSeason();
      const picked = await pickDefaultSession(season);
      if (!picked) {
        return NextResponse.json(
          { error: "No sessions available" },
          { status: 404 },
        );
      }
      sessionKey = picked.session_key;
    }

    const snapshot = await getLiveSnapshot(sessionKey);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control":
          snapshot.status === "live"
            ? "public, max-age=2, stale-while-revalidate=2"
            : "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Live feed unavailable" },
      { status: 502 },
    );
  }
}
