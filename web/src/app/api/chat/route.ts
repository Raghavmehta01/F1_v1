import {
  CHAT_OWNER_COOKIE,
  CHAT_QUOTA_COOKIE,
  OWNER_COOKIE_OPTIONS,
  QUOTA_COOKIE_OPTIONS,
  checkChatPrompt,
  incrementChatPrompt,
} from "@/lib/security/chat-quota";
import { clientIp, rateLimit, safeFetch } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

type ChatBody = {
  message?: string;
  history?: { role: string; content: string }[];
};

function applyCookies(
  res: NextResponse,
  opts: { quota?: string; owner?: string },
) {
  if (opts.quota) {
    res.cookies.set(CHAT_QUOTA_COOKIE, opts.quota, QUOTA_COOKIE_OPTIONS);
  }
  if (opts.owner) {
    res.cookies.set(CHAT_OWNER_COOKIE, opts.owner, OWNER_COOKIE_OPTIONS);
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`chat:${clientIp(req.headers)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const ownerHeader = req.headers.get("x-chat-owner-token");
  const quotaCheck = await checkChatPrompt({ ownerHeader });
  if (!quotaCheck.ok) {
    const res = NextResponse.json(
      {
        error: `Prompt limit reached (${quotaCheck.status.limit} per visitor).`,
        code: "chat_quota_exceeded",
        quota: quotaCheck.status,
      },
      {
        status: 429,
        headers: { "Retry-After": String(quotaCheck.retryAfterSec) },
      },
    );
    applyCookies(res, { quota: quotaCheck.quotaCookieValue });
    return res;
  }

  // Soft IP backup so clearing cookies alone is not unlimited free prompts.
  if (!quotaCheck.unlimited) {
    const ipQuota = rateLimit(
      `chat-quota-ip:${clientIp(req.headers)}`,
      quotaCheck.status.limit,
      60 * 60 * 24 * 1000,
    );
    if (!ipQuota.ok) {
      return NextResponse.json(
        {
          error: `Prompt limit reached (${quotaCheck.status.limit} per visitor).`,
          code: "chat_quota_exceeded",
          quota: {
            ...quotaCheck.status,
            remaining: 0,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipQuota.retryAfterSec) },
        },
      );
    }
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
  if (!message || message.length > 2000) {
    return NextResponse.json(
      { error: "message required (max 2000 chars)" },
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
        .slice(-4)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 800),
        }))
    : [];

  try {
    const upstream = await safeFetch(`${base}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ML-Secret": secret,
      },
      body: JSON.stringify({ message, history }),
      cache: "no-store",
    });
    const payload = await upstream.json();
    const headers = new Headers();
    const xCache = upstream.headers.get("X-Cache");
    if (xCache) headers.set("X-Cache", xCache);

    let quotaStatus = quotaCheck.status;
    let quotaCookie = quotaCheck.quotaCookieValue;
    if (upstream.ok && !quotaCheck.unlimited) {
      const consumed = incrementChatPrompt(quotaCheck.payload);
      quotaStatus = consumed.status;
      quotaCookie = consumed.quotaCookieValue;
    }

    const res = NextResponse.json(
      { ...payload, quota: quotaStatus },
      { status: upstream.status, headers },
    );
    applyCookies(res, {
      quota: quotaCookie,
      owner: quotaCheck.ownerCookieValue,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Chat service unavailable",
        status: "unavailable",
        quota: quotaCheck.status,
      },
      { status: 502 },
    );
  }
}
