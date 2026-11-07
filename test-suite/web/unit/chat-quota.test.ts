import { beforeEach, describe, expect, it, vi } from "vitest";

describe("feature: chat prompt quota + owner unlock", () => {
  beforeEach(() => {
    process.env.ML_SHARED_SECRET = "test-ml-secret";
    process.env.CHAT_OWNER_TOKEN = "test-owner-token";
    process.env.CHAT_PROMPTS_LIMIT = "5";
    vi.resetModules();
  });

  it("increments visitor usage until remaining hits zero", async () => {
    const quota = await import("@/lib/security/chat-quota");
    expect(quota.chatPromptsLimit()).toBe(5);

    let payload = { n: 0, v: "visitor-1" };
    for (let i = 0; i < 5; i++) {
      const next = quota.incrementChatPrompt(payload);
      payload = { n: next.status.used, v: payload.v };
      expect(next.status.used).toBe(i + 1);
      expect(next.status.remaining).toBe(5 - (i + 1));
      expect(next.quotaCookieValue).toContain(".");
    }
    expect(payload.n).toBe(5);
  });

  it("recognizes the owner token and issues a valid owner cookie", async () => {
    const quota = await import("@/lib/security/chat-quota");
    expect(quota.isOwnerToken("wrong")).toBe(false);
    expect(quota.isOwnerToken("test-owner-token")).toBe(true);

    const unlocked = quota.ownerUnlockCookieValue("test-owner-token");
    expect(unlocked).toBeTruthy();
    expect(quota.decodeOwnerCookie(unlocked!)).toBe(true);
  });

  it("rejects invalid owner unlock tokens / tampered cookies", async () => {
    const quota = await import("@/lib/security/chat-quota");
    expect(quota.ownerUnlockCookieValue("nope")).toBeNull();
    expect(quota.decodeOwnerCookie("tampered.sig")).toBe(false);
    expect(quota.decodeOwnerCookie(undefined)).toBe(false);
  });
});
