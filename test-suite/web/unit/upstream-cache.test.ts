import { describe, expect, it, vi } from "vitest";
import {
  UpstreamRateLimitError,
  createUpstreamCache,
} from "@/lib/data/upstream-cache";

describe("feature: upstream cache (TTL / 429 stale)", () => {
  it("returns cached value within TTL without re-fetching", async () => {
    const cache = createUpstreamCache("test");
    const fetcher = vi.fn(async () =>
      Response.json({ ok: true }, { status: 200 }),
    );

    const a = await cache.getJson("k1", fetcher, { ttlSec: 60 });
    const b = await cache.getJson("k1", fetcher, { ttlSec: 60 });
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves stale value on 429 when stale window allows", async () => {
    const cache = createUpstreamCache("test");
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return Response.json({ n: 1 }, { status: 200 });
      return new Response("nope", {
        status: 429,
        headers: { "retry-after": "30" },
      });
    });

    await cache.getJson("k2", fetcher, { ttlSec: 0, staleSec: 120 });
    // Force expiry by using ttlSec 0 — entry may already be expired; use peek path
    // Re-seed with short ttl then wait is flaky; instead call again after
    // manually relying on stale: first call stores with staleSec.
    // With ttlSec 0, expiresAt is immediate so second call re-fetches.
    const stale = await cache.getJson<{ n: number }>("k2", fetcher, {
      ttlSec: 0,
      staleSec: 120,
    });
    expect(stale).toEqual({ n: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("throws UpstreamRateLimitError when 429 and no stale", async () => {
    const cache = createUpstreamCache("test");
    const fetcher = vi.fn(
      async () =>
        new Response("limited", {
          status: 429,
          headers: { "retry-after": "12" },
        }),
    );

    await expect(
      cache.getJson("fresh", fetcher, { ttlSec: 30, staleSec: 30 }),
    ).rejects.toBeInstanceOf(UpstreamRateLimitError);
  });

  it("single-flights concurrent requests for the same key", async () => {
    const cache = createUpstreamCache("test");
    let resolve!: (v: Response) => void;
    const gate = new Promise<Response>((r) => {
      resolve = r;
    });
    const fetcher = vi.fn(() => gate);

    const p1 = cache.getJson("sf", fetcher, { ttlSec: 60 });
    const p2 = cache.getJson("sf", fetcher, { ttlSec: 60 });
    resolve(Response.json({ shared: true }));
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toEqual({ shared: true });
    expect(b).toEqual({ shared: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
