import {
  OpenF1RateLimitError,
  getLiveSnapshot,
  openf1RateLimitedForSec,
  pickDefaultSession,
  resolveOpenF1Season,
} from "@/lib/data/openf1-live";
import { clientIp, rateLimit } from "@/lib/security";
import { parseSeason } from "@/lib/security/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limited = rateLimit(`live:${clientIp(req.headers)}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const cooldown = openf1RateLimitedForSec();
  const sp = req.nextUrl.searchParams;
  const rawKey = sp.get("session_key");
  let sessionKey = rawKey ? Number.parseInt(rawKey, 10) : NaN;

  try {
    if (!Number.isFinite(sessionKey)) {
      const hinted = parseSeason(sp.get("season"));
      const season = await resolveOpenF1Season(hinted);
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
    const retry = openf1RateLimitedForSec();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control":
          snapshot.status === "live"
            ? "public, max-age=6, stale-while-revalidate=20"
            : "public, max-age=60, stale-while-revalidate=300",
        ...(retry > 0 ? { "Retry-After": String(retry) } : {}),
        ...(snapshot.degraded ? { "X-OpenF1-Degraded": "1" } : {}),
      },
    });
  } catch (e) {
    if (e instanceof OpenF1RateLimitError) {
      return NextResponse.json(
        { error: e.message, retry_after: e.retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(e.retryAfterSec) },
        },
      );
    }
    const retry = cooldown || openf1RateLimitedForSec();
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Live feed unavailable" },
      {
        status: 502,
        headers: retry > 0 ? { "Retry-After": String(retry) } : undefined,
      },
    );
  }
}
