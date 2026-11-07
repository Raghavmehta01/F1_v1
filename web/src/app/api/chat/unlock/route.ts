import {
  CHAT_OWNER_COOKIE,
  OWNER_COOKIE_OPTIONS,
  ownerUnlockCookieValue,
} from "@/lib/security/chat-quota";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let token = "";
  try {
    const body = (await req.json()) as { token?: string };
    token = (body.token ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cookie = ownerUnlockCookieValue(token);
  if (!cookie) {
    return NextResponse.json({ error: "Invalid owner token" }, { status: 401 });
  }

  const res = NextResponse.json({
    ok: true,
    unlimited: true,
    message: "Owner unlocked for this browser",
  });
  res.cookies.set(CHAT_OWNER_COOKIE, cookie, OWNER_COOKIE_OPTIONS);
  return res;
}
