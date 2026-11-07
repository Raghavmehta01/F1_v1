import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/ingest/route";

describe("feature: web chat ingest is admin-only", () => {
  it("rejects public ingest with 403", async () => {
    const res = await POST();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin-only/i);
  });
});
