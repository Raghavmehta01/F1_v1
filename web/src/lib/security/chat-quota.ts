import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const CHAT_QUOTA_COOKIE = "f1_chat_q";
export const CHAT_OWNER_COOKIE = "f1_chat_owner";
export const CHAT_PROMPTS_LIMIT_DEFAULT = 5;

export type QuotaPayload = {
  /** Successful prompt count */
  n: number;
  /** Visitor id */
  v: string;
};

function signingSecret(): string {
  return (
    process.env.CHAT_QUOTA_SECRET ||
    process.env.ML_SHARED_SECRET ||
    "dev-chat-quota"
  );
}

export function chatPromptsLimit(): number {
  const raw = Number.parseInt(process.env.CHAT_PROMPTS_LIMIT ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : CHAT_PROMPTS_LIMIT_DEFAULT;
}

export function ownerTokenConfigured(): string {
  return (process.env.CHAT_OWNER_TOKEN ?? "").trim();
}

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", signingSecret()).update(body).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function encodeQuota(payload: QuotaPayload): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function decodeQuota(raw: string | undefined): QuotaPayload | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as QuotaPayload;
    if (
      typeof parsed?.n !== "number" ||
      typeof parsed?.v !== "string" ||
      !parsed.v ||
      parsed.n < 0
    ) {
      return null;
    }
    return { n: Math.floor(parsed.n), v: parsed.v };
  } catch {
    return null;
  }
}

function newVisitorId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isOwnerToken(token: string | null | undefined): boolean {
  const expected = ownerTokenConfigured();
  if (!expected || !token) return false;
  try {
    return safeEqual(token, expected);
  } catch {
    return false;
  }
}

function encodeOwnerCookie(): string {
  const body = b64url(JSON.stringify({ o: 1, t: Date.now() }));
  return `${body}.${sign(`owner:${body}`)}`;
}

export function decodeOwnerCookie(raw: string | undefined): boolean {
  if (!raw) return false;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEqual(sig, sign(`owner:${body}`))) return false;
  try {
    const parsed = JSON.parse(fromB64url(body).toString("utf8")) as {
      o?: number;
    };
    return parsed?.o === 1;
  } catch {
    return false;
  }
}

export type ChatQuotaStatus = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
};

export async function readChatQuota(opts?: {
  ownerHeader?: string | null;
}): Promise<{
  status: ChatQuotaStatus;
  quotaCookieValue: string;
  setOwnerCookie?: string;
}> {
  const jar = await cookies();
  const unlimited =
    isOwnerToken(opts?.ownerHeader) ||
    decodeOwnerCookie(jar.get(CHAT_OWNER_COOKIE)?.value);

  const limit = chatPromptsLimit();
  const existing = decodeQuota(jar.get(CHAT_QUOTA_COOKIE)?.value);
  const payload: QuotaPayload = existing ?? { n: 0, v: newVisitorId() };
  const used = unlimited ? 0 : payload.n;
  const remaining = unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);

  return {
    status: {
      unlimited,
      limit,
      used,
      remaining: unlimited ? limit : remaining,
    },
    quotaCookieValue: encodeQuota(payload),
  };
}

export async function checkChatPrompt(opts?: {
  ownerHeader?: string | null;
}): Promise<
  | {
      ok: true;
      unlimited: boolean;
      status: ChatQuotaStatus;
      quotaCookieValue: string;
      ownerCookieValue?: string;
      payload: QuotaPayload;
    }
  | {
      ok: false;
      status: ChatQuotaStatus;
      quotaCookieValue: string;
      retryAfterSec: number;
    }
> {
  const jar = await cookies();
  const ownerFromHeader = isOwnerToken(opts?.ownerHeader);
  const ownerFromCookie = decodeOwnerCookie(jar.get(CHAT_OWNER_COOKIE)?.value);
  const unlimited = ownerFromHeader || ownerFromCookie;

  const limit = chatPromptsLimit();
  const existing = decodeQuota(jar.get(CHAT_QUOTA_COOKIE)?.value);
  const payload: QuotaPayload = existing ?? { n: 0, v: newVisitorId() };

  if (unlimited) {
    return {
      ok: true,
      unlimited: true,
      status: { unlimited: true, limit, used: 0, remaining: limit },
      quotaCookieValue: encodeQuota(payload),
      ownerCookieValue: ownerFromHeader ? encodeOwnerCookie() : undefined,
      payload,
    };
  }

  if (payload.n >= limit) {
    return {
      ok: false,
      status: {
        unlimited: false,
        limit,
        used: payload.n,
        remaining: 0,
      },
      quotaCookieValue: encodeQuota(payload),
      retryAfterSec: 60 * 60 * 24,
    };
  }

  return {
    ok: true,
    unlimited: false,
    status: {
      unlimited: false,
      limit,
      used: payload.n,
      remaining: Math.max(0, limit - payload.n),
    },
    quotaCookieValue: encodeQuota(payload),
    payload,
  };
}

/** Call only after a successful upstream chat response. */
export function incrementChatPrompt(payload: QuotaPayload): {
  status: ChatQuotaStatus;
  quotaCookieValue: string;
} {
  const limit = chatPromptsLimit();
  const next = { ...payload, n: payload.n + 1 };
  return {
    status: {
      unlimited: false,
      limit,
      used: next.n,
      remaining: Math.max(0, limit - next.n),
    },
    quotaCookieValue: encodeQuota(next),
  };
}

export function ownerUnlockCookieValue(token: string): string | null {
  if (!isOwnerToken(token)) return null;
  return encodeOwnerCookie();
}

export const QUOTA_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export const OWNER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
