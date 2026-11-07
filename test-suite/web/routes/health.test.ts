import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("feature: web health route", () => {
  it("returns ok payload", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "ok",
      service: "f1_v1-web",
    });
  });
});
