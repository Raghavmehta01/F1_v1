import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/unlock/route";

function req(body: unknown) {
  return new Request("http://localhost/api/chat/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as import("next/server").NextRequest;
}

describe("feature: chat owner unlock route", () => {
  it("unlocks with the configured owner token", async () => {
    process.env.CHAT_OWNER_TOKEN = "test-owner-token";
    process.env.ML_SHARED_SECRET = "test-ml-secret";

    const res = await POST(req({ token: "test-owner-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unlimited).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("f1_chat_owner=");
  });

  it("rejects a bad token", async () => {
    process.env.CHAT_OWNER_TOKEN = "test-owner-token";
    const res = await POST(req({ token: "wrong" }));
    expect(res.status).toBe(401);
  });
});
