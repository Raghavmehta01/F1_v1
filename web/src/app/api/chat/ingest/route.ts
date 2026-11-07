import { NextResponse } from "next/server";

/**
 * Public ingest is disabled — only the operator should rebuild the knowledge
 * base via CLI: `cd api && python -m scripts.ingest_official`
 * (or POST /chat/ingest on the FastAPI service with X-ML-Secret).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Ingest is admin-only and disabled in the web app.",
    },
    { status: 403 },
  );
}
