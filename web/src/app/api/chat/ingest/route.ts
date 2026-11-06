import { clientIp, rateLimit, safeFetch } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

/** Admin-ish: rebuild Chroma from official FIA PDFs (shared secret on API). */
export async function POST(req: NextRequest) {
  const limited = rateLimit(`chat-ingest:${clientIp(req.headers)}`, 2, 300_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const secret = process.env.ML_SHARED_SECRET;
  const base = process.env.ML_API_URL ?? "http://127.0.0.1:8000";
  if (!secret) {
    return NextResponse.json(
      { error: "ML_SHARED_SECRET not configured" },
      { status: 503 },
    );
  }

  const force =
    req.nextUrl.searchParams.get("force_download") === "1" ? "true" : "false";

  try {
    const res = await safeFetch(
      `${base}/chat/ingest?reset=true&force_download=${force}`,
      {
        method: "POST",
        headers: { "X-ML-Secret": secret },
        cache: "no-store",
      },
    );
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Ingest unavailable",
      },
      { status: 502 },
    );
  }
}
