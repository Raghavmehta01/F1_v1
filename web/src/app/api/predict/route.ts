import { clientIp, rateLimit, safeFetch } from "@/lib/security";
import { parseRound, parseSeason } from "@/lib/security/validation";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const limited = rateLimit(`predict:${clientIp(req.headers)}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const season = parseSeason(req.nextUrl.searchParams.get("season"));
  const round = parseRound(req.nextUrl.searchParams.get("round"));
  if (season == null || round == null) {
    return NextResponse.json(
      { error: "Valid season and round required" },
      { status: 400 },
    );
  }

  const base = process.env.ML_API_URL ?? "http://127.0.0.1:8000";
  const secret = process.env.ML_SHARED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "ML_SHARED_SECRET not configured" },
      { status: 503 },
    );
  }

  try {
    const res = await safeFetch(
      `${base}/predict?season=${season}&round=${round}`,
      {
        headers: { "X-ML-Secret": secret },
        cache: "no-store",
      },
    );
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "ML service unavailable",
        status: "unavailable",
      },
      { status: 502 },
    );
  }
}
