import { clientIp, rateLimit, safeFetch } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

type ChatBody = {
  message?: string;
  history?: { role: string; content: string }[];
};

export async function POST(req: NextRequest) {
  const limited = rateLimit(`chat:${clientIp(req.headers)}`, 20, 60_000);
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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message || message.length > 4000) {
    return NextResponse.json(
      { error: "message required (max 4000 chars)" },
      { status: 400 },
    );
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-16)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 4000),
        }))
    : [];

  try {
    const res = await safeFetch(`${base}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ML-Secret": secret,
      },
      body: JSON.stringify({ message, history }),
      cache: "no-store",
    });
    const payload = await res.json();
    return NextResponse.json(payload, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Chat service unavailable",
        status: "unavailable",
      },
      { status: 502 },
    );
  }
}
