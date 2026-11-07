import { CACHE_TTL } from "@/lib/data/cache";
import { openf1GetCached } from "@/lib/data/openf1-http";

export type OpenF1Driver = {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string | null;
  first_name: string;
  last_name: string;
  headshot_url: string | null;
  session_key: number;
  meeting_key: number;
};

export type OpenF1Meeting = {
  meeting_key: number;
  meeting_name: string;
  location: string;
  country_name: string;
  country_code: string;
  country_flag: string | null;
  circuit_short_name: string;
  circuit_image: string | null;
  circuit_key: number;
  date_start: string;
  date_end: string;
  year: number;
  is_cancelled: boolean;
};

/** Current / latest session driver list with official headshot URLs. */
export async function getLatestDrivers(): Promise<OpenF1Driver[]> {
  return openf1GetCached<OpenF1Driver[]>("/drivers?session_key=latest", {
    ttlSec: CACHE_TTL.media,
    staleSec: CACHE_TTL.mediaStale,
  });
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return openf1GetCached<OpenF1Meeting[]>(`/meetings?year=${year}`, {
    ttlSec: CACHE_TTL.sessions,
    staleSec: CACHE_TTL.sessionsStale,
  });
}

export type DriverMediaIndex = {
  byAcronym: Map<string, OpenF1Driver>;
  byLastName: Map<string, OpenF1Driver>;
  byNumber: Map<number, OpenF1Driver>;
  list: OpenF1Driver[];
};

let mediaIndexCache:
  | { expiresAt: number; value: DriverMediaIndex }
  | null = null;

export async function getDriverMediaIndex(): Promise<DriverMediaIndex> {
  const now = Date.now();
  if (mediaIndexCache && mediaIndexCache.expiresAt > now) {
    return mediaIndexCache.value;
  }

  const list = await getLatestDrivers();
  const byAcronym = new Map<string, OpenF1Driver>();
  const byLastName = new Map<string, OpenF1Driver>();
  const byNumber = new Map<number, OpenF1Driver>();
  for (const d of list) {
    byAcronym.set(d.name_acronym.toUpperCase(), d);
    byLastName.set(d.last_name.toLowerCase(), d);
    byNumber.set(d.driver_number, d);
  }
  const value = { byAcronym, byLastName, byNumber, list };
  mediaIndexCache = {
    value,
    expiresAt: now + CACHE_TTL.media * 1000,
  };
  return value;
}

export function matchOpenF1Driver(
  index: DriverMediaIndex,
  opts: { code?: string; familyName?: string; number?: string },
): OpenF1Driver | null {
  if (opts.code) {
    const hit = index.byAcronym.get(opts.code.toUpperCase());
    if (hit) return hit;
  }
  if (opts.number) {
    const n = Number.parseInt(opts.number, 10);
    if (Number.isFinite(n)) {
      const hit = index.byNumber.get(n);
      if (hit) return hit;
    }
  }
  if (opts.familyName) {
    return index.byLastName.get(opts.familyName.toLowerCase()) ?? null;
  }
  return null;
}

export { fullDriverImage, largerHeadshot, heroHeadshot } from "@/lib/media";
