type CacheEntry = {
  expiresAt: number;
  staleUntil: number;
  value: unknown;
};

type FlightEntry = {
  promise: Promise<unknown>;
};

export class UpstreamRateLimitError extends Error {
  retryAfterSec: number;
  upstream: string;
  constructor(upstream: string, retryAfterSec: number, detail: string) {
    super(`${upstream} rate limited (${retryAfterSec}s) for ${detail}`);
    this.name = "UpstreamRateLimitError";
    this.upstream = upstream;
    this.retryAfterSec = retryAfterSec;
  }
}

function parseRetryAfter(header: string | null): number {
  if (!header) return 30;
  const asInt = Number.parseInt(header, 10);
  if (Number.isFinite(asInt) && asInt > 0) return Math.min(asInt, 180);
  const when = Date.parse(header);
  if (Number.isFinite(when)) {
    return Math.min(Math.max(1, Math.ceil((when - Date.now()) / 1000)), 180);
  }
  return 30;
}

/**
 * Process-local cache for third-party HTTP:
 * TTL hit · single-flight · stale-on-429/error · cooldown
 */
export function createUpstreamCache(upstream: string) {
  const memory = new Map<string, CacheEntry>();
  const flights = new Map<string, FlightEntry>();
  let rateLimitedUntil = 0;

  async function getJson<T>(
    key: string,
    fetcher: () => Promise<Response>,
    opts: { ttlSec: number; staleSec?: number },
  ): Promise<T> {
    const now = Date.now();
    const staleSec = opts.staleSec ?? Math.max(opts.ttlSec * 4, 60);
    const hit = memory.get(key);

    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }

    if (rateLimitedUntil > now) {
      if (hit && hit.staleUntil > now) return hit.value as T;
      throw new UpstreamRateLimitError(
        upstream,
        Math.ceil((rateLimitedUntil - now) / 1000),
        key,
      );
    }

    const existing = flights.get(key);
    if (existing) return existing.promise as Promise<T>;

    const promise = (async () => {
      try {
        const res = await fetcher();

        if (res.status === 429) {
          const retry = parseRetryAfter(res.headers.get("retry-after"));
          rateLimitedUntil = Date.now() + retry * 1000;
          if (hit && hit.staleUntil > Date.now()) return hit.value as T;
          throw new UpstreamRateLimitError(upstream, retry, key);
        }

        if (!res.ok) {
          if (hit && hit.staleUntil > Date.now()) return hit.value as T;
          throw new Error(`${upstream} ${res.status} for ${key}`);
        }

        const value = (await res.json()) as T;
        const stamped = Date.now();
        memory.set(key, {
          value,
          expiresAt: stamped + opts.ttlSec * 1000,
          staleUntil: stamped + staleSec * 1000,
        });
        return value;
      } finally {
        flights.delete(key);
      }
    })();

    flights.set(key, { promise });
    return promise as Promise<T>;
  }

  async function getText(
    key: string,
    fetcher: () => Promise<Response>,
    opts: { ttlSec: number; staleSec?: number },
  ): Promise<string> {
    const now = Date.now();
    const staleSec = opts.staleSec ?? Math.max(opts.ttlSec * 4, 60);
    const hit = memory.get(key);

    if (hit && hit.expiresAt > now) {
      return hit.value as string;
    }

    if (rateLimitedUntil > now) {
      if (hit && hit.staleUntil > now) return hit.value as string;
      throw new UpstreamRateLimitError(
        upstream,
        Math.ceil((rateLimitedUntil - now) / 1000),
        key,
      );
    }

    const existing = flights.get(key);
    if (existing) return existing.promise as Promise<string>;

    const promise = (async () => {
      try {
        const res = await fetcher();

        if (res.status === 429) {
          const retry = parseRetryAfter(res.headers.get("retry-after"));
          rateLimitedUntil = Date.now() + retry * 1000;
          if (hit && hit.staleUntil > Date.now()) return hit.value as string;
          throw new UpstreamRateLimitError(upstream, retry, key);
        }

        if (!res.ok) {
          if (hit && hit.staleUntil > Date.now()) return hit.value as string;
          throw new Error(`${upstream} ${res.status} for ${key}`);
        }

        const value = await res.text();
        const stamped = Date.now();
        memory.set(key, {
          value,
          expiresAt: stamped + opts.ttlSec * 1000,
          staleUntil: stamped + staleSec * 1000,
        });
        return value;
      } finally {
        flights.delete(key);
      }
    })();

    flights.set(key, { promise });
    return promise;
  }

  function peek<T>(key: string): T | null {
    const hit = memory.get(key);
    if (!hit || hit.staleUntil < Date.now()) return null;
    return hit.value as T;
  }

  function rateLimitedForSec(): number {
    const left = rateLimitedUntil - Date.now();
    return left > 0 ? Math.ceil(left / 1000) : 0;
  }

  return { getJson, getText, peek, rateLimitedForSec };
}
