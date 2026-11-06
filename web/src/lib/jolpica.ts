import { CACHE_TTL } from "@/lib/cache";
import { safeFetch } from "@/lib/security";
import type {
  ConstructorStanding,
  DriverStanding,
  Race,
} from "@/lib/types";
import { currentSeason } from "@/lib/validation";

const BASE = "https://api.jolpi.ca/ergast/f1";
const USER_AGENT = "F1_v1/0.1.0 (https://github.com/Raghavmehta01/F1_v1)";

type MrData = {
  RaceTable?: { Races: Race[]; season?: string };
  StandingsTable?: {
    StandingsLists: Array<{
      season: string;
      round?: string;
      DriverStandings?: DriverStanding[];
      ConstructorStandings?: ConstructorStanding[];
    }>;
  };
  SeasonTable?: { Seasons: Array<{ season: string; url?: string }> };
  DriverTable?: { Drivers: Array<Record<string, string>> };
  ConstructorTable?: { Constructors: Array<Record<string, string>> };
  CircuitTable?: { Circuits: Array<Record<string, unknown>> };
};

async function jolpicaGet(
  path: string,
  revalidate: number,
): Promise<MrData> {
  const url = `${BASE}${path}`;
  const res = await safeFetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Jolpica ${res.status} for ${path}`);
  }
  const json = (await res.json()) as { MRData: MrData };
  return json.MRData;
}

/** Jolpica's active season (preferred over calendar year). */
export async function getActiveSeasonYear(): Promise<number> {
  try {
    const data = await jolpicaGet("/current.json", CACHE_TTL.calendar);
    const fromTable = data.RaceTable?.season;
    if (fromTable) return Number.parseInt(fromTable, 10);
    const first = data.RaceTable?.Races?.[0]?.season;
    if (first) return Number.parseInt(first, 10);
  } catch {
    /* fall through */
  }
  return currentSeason();
}

function seasonPath(season: number | "current"): string {
  return season === "current" ? "current" : String(season);
}

export async function getSeasons(): Promise<string[]> {
  const data = await jolpicaGet("/seasons.json?limit=100", CACHE_TTL.seasons);
  return (data.SeasonTable?.Seasons ?? []).map((s) => s.season).reverse();
}

export async function getSeasonCalendar(
  season: number | "current" = "current",
): Promise<Race[]> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}.json`,
    CACHE_TTL.calendar,
  );
  return data.RaceTable?.Races ?? [];
}

export type StandingsPayload = {
  season: string;
  round: string;
  standings: DriverStanding[];
};

export async function getDriverStandingsDetailed(
  season: number | "current" = "current",
): Promise<StandingsPayload> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/driverStandings.json`,
    CACHE_TTL.standings,
  );
  const list = data.StandingsTable?.StandingsLists?.[0];
  return {
    season: list?.season ?? String(season),
    round: list?.round ?? "—",
    standings: list?.DriverStandings ?? [],
  };
}

export async function getDriverStandings(
  season: number | "current" = "current",
): Promise<DriverStanding[]> {
  const { standings } = await getDriverStandingsDetailed(season);
  return standings;
}

export async function getConstructorStandings(
  season: number | "current" = "current",
): Promise<ConstructorStanding[]> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/constructorStandings.json`,
    CACHE_TTL.standings,
  );
  return data.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
}

export async function getLastRace(
  season: number | "current" = "current",
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/last/results.json`,
    CACHE_TTL.raceResult,
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

export async function getRaceResults(
  season: number,
  round: number,
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${season}/${round}/results.json`,
    CACHE_TTL.raceResult,
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

export async function getQualifying(
  season: number,
  round: number,
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${season}/${round}/qualifying.json`,
    CACHE_TTL.raceResult,
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

export async function getDriver(driverId: string) {
  const data = await jolpicaGet(
    `/drivers/${driverId}.json`,
    CACHE_TTL.circuits,
  );
  return data.DriverTable?.Drivers?.[0] ?? null;
}

export async function getConstructor(constructorId: string) {
  const data = await jolpicaGet(
    `/constructors/${constructorId}.json`,
    CACHE_TTL.circuits,
  );
  return data.ConstructorTable?.Constructors?.[0] ?? null;
}

export async function getCircuit(circuitId: string) {
  const data = await jolpicaGet(
    `/circuits/${circuitId}.json`,
    CACHE_TTL.circuits,
  );
  return data.CircuitTable?.Circuits?.[0] ?? null;
}

/** Next upcoming race by calendar date (UTC day), else last race of season. */
export function pickFeaturedRace(races: Race[]): {
  race: Race;
  status: "upcoming" | "completed";
} | null {
  if (!races.length) return null;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = races.find((r) => r.date >= today);
  if (upcoming) return { race: upcoming, status: "upcoming" };
  return { race: races[races.length - 1]!, status: "completed" };
}
