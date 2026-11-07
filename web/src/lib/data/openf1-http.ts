import { safeFetch } from "@/lib/security";
import {
  UpstreamRateLimitError,
  createUpstreamCache,
} from "@/lib/data/upstream-cache";

const cache = createUpstreamCache("OpenF1");

export class OpenF1RateLimitError extends Error {
  retryAfterSec: number;
  constructor(retryAfterSec: number, path: string) {
    super(`OpenF1 rate limited (${retryAfterSec}s) for ${path}`);
    this.name = "OpenF1RateLimitError";
    this.retryAfterSec = retryAfterSec;
  }
}

function asOpenF1Error(e: unknown, path: string): never {
  if (e instanceof UpstreamRateLimitError) {
    throw new OpenF1RateLimitError(e.retryAfterSec, path);
  }
  throw e;
}

/** OpenF1 GET with process memory TTL, single-flight, and stale-on-429. */
export async function openf1GetCached<T>(
  path: string,
  opts: {
    ttlSec: number;
    staleSec?: number;
  },
): Promise<T> {
  try {
    return await cache.getJson<T>(
      path,
      () =>
        safeFetch(`https://api.openf1.org/v1${path}`, {
          headers: { Accept: "application/json" },
          next: { revalidate: opts.ttlSec },
        }),
      opts,
    );
  } catch (e) {
    asOpenF1Error(e, path);
  }
}

export function openf1PeekCache<T>(path: string): T | null {
  return cache.peek<T>(path);
}

export function openf1RateLimitedForSec(): number {
  return cache.rateLimitedForSec();
}
