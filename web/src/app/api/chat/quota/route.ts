import {
  CHAT_OWNER_COOKIE,
  CHAT_QUOTA_COOKIE,
  OWNER_COOKIE_OPTIONS,
  QUOTA_COOKIE_OPTIONS,
  isOwnerToken,
  ownerUnlockCookieValue,
  readChatQuota,
} from "@/lib/security/chat-quota";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ownerHeader = req.headers.get("x-chat-owner-token");
  const { status, quotaCookieValue } = await readChatQuota({ ownerHeader });
  const res = NextResponse.json({ quota: status });
  res.cookies.set(CHAT_QUOTA_COOKIE, quotaCookieValue, QUOTA_COOKIE_OPTIONS);
  if (ownerHeader && isOwnerToken(ownerHeader)) {
    const unlocked = ownerUnlockCookieValue(ownerHeader);
    if (unlocked) {
      res.cookies.set(CHAT_OWNER_COOKIE, unlocked, OWNER_COOKIE_OPTIONS);
    }
  }
  return res;
}
