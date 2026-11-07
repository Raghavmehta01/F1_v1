import { describe, expect, it } from "vitest";
import {
  assertAllowedUrl,
  clientIp,
  rateLimit,
} from "@/lib/security";

describe("feature: upstream security + rate limit", () => {
  it("allows known HTTPS upstreams", () => {
    expect(assertAllowedUrl("https://api.jolpi.ca/ergast/f1/2026.json").hostname).toBe(
      "api.jolpi.ca",
    );
    expect(assertAllowedUrl("https://api.openf1.org/v1/sessions").hostname).toBe(
      "api.openf1.org",
    );
    expect(assertAllowedUrl("https://www.formula1.com/feed").hostname).toBe(
      "www.formula1.com",
    );
  });

  it("allows localhost / docker api over http", () => {
    expect(assertAllowedUrl("http://127.0.0.1:8000/chat").hostname).toBe(
      "127.0.0.1",
    );
    expect(assertAllowedUrl("http://api:8000/health").hostname).toBe("api");
  });

  it("rejects unknown hosts", () => {
    expect(() => assertAllowedUrl("https://evil.example/x")).toThrow(
      /not allowlisted/i,
    );
  });

  it("rejects non-loopback http", () => {
    expect(() => assertAllowedUrl("http://evil.example/x")).toThrow(/HTTP/i);
  });

  it("auto-allows ML_API_URL hostname", () => {
    const prev = process.env.ML_API_URL;
    process.env.ML_API_URL = "https://f1-api.example.com";
    try {
      expect(
        assertAllowedUrl("https://f1-api.example.com/chat").hostname,
      ).toBe("f1-api.example.com");
    } finally {
      process.env.ML_API_URL = prev;
    }
  });

  it("rateLimit blocks after N hits in the window", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("clientIp reads forwarded headers", () => {
    const h = new Headers({
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    });
    expect(clientIp(h)).toBe("203.0.113.9");
  });
});
