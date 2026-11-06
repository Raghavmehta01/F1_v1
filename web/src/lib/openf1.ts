import { CACHE_TTL } from "@/lib/cache";
import { safeFetch } from "@/lib/security";

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

async function openf1Get<T>(path: string, revalidate: number): Promise<T> {
  const url = `https://api.openf1.org/v1${path}`;
  const res = await safeFetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`OpenF1 ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

/** Current / latest session driver list with official headshot URLs. */
export async function getLatestDrivers(): Promise<OpenF1Driver[]> {
  return openf1Get<OpenF1Driver[]>(
    "/drivers?session_key=latest",
    CACHE_TTL.media,
  );
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return openf1Get<OpenF1Meeting[]>(
    `/meetings?year=${year}`,
    CACHE_TTL.calendar,
  );
}

export type DriverMediaIndex = {
  byAcronym: Map<string, OpenF1Driver>;
  byLastName: Map<string, OpenF1Driver>;
  byNumber: Map<number, OpenF1Driver>;
  list: OpenF1Driver[];
};

export async function getDriverMediaIndex(): Promise<DriverMediaIndex> {
  const list = await getLatestDrivers();
  const byAcronym = new Map<string, OpenF1Driver>();
  const byLastName = new Map<string, OpenF1Driver>();
  const byNumber = new Map<number, OpenF1Driver>();
  for (const d of list) {
    byAcronym.set(d.name_acronym.toUpperCase(), d);
    byLastName.set(d.last_name.toLowerCase(), d);
    byNumber.set(d.driver_number, d);
  }
  return { byAcronym, byLastName, byNumber, list };
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
