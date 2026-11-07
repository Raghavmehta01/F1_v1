/** Upstream hosts this app is allowed to call. Prevents SSRF via open proxy. */
export const ALLOWED_HOSTS = new Set([
  "api.jolpi.ca",
  "api.openf1.org",
  "api.groq.com",
  "www.formula1.com",
  "formula1.com",
  "127.0.0.1",
  "localhost",
  // docker compose service name for the FastAPI container
  "api",
]);

/** Hosts allowed for http:// (loopback + docker internal network). */
const HTTP_HOSTS = new Set(["127.0.0.1", "localhost", "api"]);

function allowedHosts(): Set<string> {
  const hosts = new Set(ALLOWED_HOSTS);
  const ml = process.env.ML_API_URL;
  if (ml) {
    try {
      hosts.add(new URL(ml).hostname);
    } catch {
      /* ignore bad ML_API_URL */
    }
  }
  for (const h of (process.env.ALLOWED_UPSTREAM_HOSTS ?? "").split(",")) {
    const trimmed = h.trim().toLowerCase();
    if (trimmed) hosts.add(trimmed);
  }
  return hosts;
}

export function assertAllowedUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported protocol");
  }
  // Local ML / docker may use http; public upstreams must be https
  if (parsed.protocol === "http:" && !HTTP_HOSTS.has(parsed.hostname)) {
    throw new Error("HTTP only allowed for localhost / docker api");
  }
  if (!allowedHosts().has(parsed.hostname)) {
    throw new Error(`Host not allowlisted: ${parsed.hostname}`);
  }
  return parsed;
}

export async function safeFetch(
  url: string,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
): Promise<Response> {
  const parsed = assertAllowedUrl(url);
  return fetch(parsed.toString(), init);
}

/** Simple in-memory sliding window rate limiter (per process). */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= limit) {
    const retryAfterSec = Math.ceil((hits[0]! + windowMs - now) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
