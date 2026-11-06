import { safeFetch } from "@/lib/security";
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.ML_API_URL ?? "http://127.0.0.1:8000";
  try {
    const res = await safeFetch(`${base}/chat/knowledge`, { cache: "no-store" });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        collection_count: 0,
        ready: false,
        groq_configured: false,
        error: e instanceof Error ? e.message : "unavailable",
      },
      { status: 502 },
    );
  }
}
