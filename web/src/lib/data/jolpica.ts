import { CACHE_TTL } from "@/lib/data/cache";
import { safeFetch } from "@/lib/security";
import type {
  ConstructorStanding,
  DriverStanding,
  Race,
} from "@/lib/data/types";
import { createUpstreamCache } from "@/lib/data/upstream-cache";
import { currentSeason } from "@/lib/security/validation";

const BASE = "https://api.jolpi.ca/ergast/f1";
const USER_AGENT = "LapLedger/0.1.0 (https://github.com/Raghavmehta01/lapledger)";
const jolpicaCache = createUpstreamCache("Jolpica");

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

type CacheKind = "calendar" | "standings" | "raceResult" | "seasons" | "circuits";

function ttlFor(kind: CacheKind): { ttlSec: number; staleSec: number } {
  switch (kind) {
    case "standings":
      return { ttlSec: CACHE_TTL.standings, staleSec: CACHE_TTL.standingsStale };
    case "raceResult":
      return {
        ttlSec: CACHE_TTL.raceResult,
        staleSec: CACHE_TTL.raceResultStale,
      };
    case "seasons":
      return { ttlSec: CACHE_TTL.seasons, staleSec: CACHE_TTL.seasonsStale };
    case "circuits":
      return { ttlSec: CACHE_TTL.circuits, staleSec: CACHE_TTL.circuitsStale };
    default:
      return { ttlSec: CACHE_TTL.calendar, staleSec: CACHE_TTL.calendarStale };
  }
}

async function jolpicaGet(
  path: string,
  kind: CacheKind = "calendar",
): Promise<MrData> {
  const { ttlSec, staleSec } = ttlFor(kind);
  const envelope = await jolpicaCache.getJson<{ MRData: MrData }>(
    path,
    () =>
      safeFetch(`${BASE}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        next: { revalidate: ttlSec },
      }),
    { ttlSec, staleSec },
  );
  return envelope.MRData;
}

/** Jolpica's active season (preferred over calendar year). */
export async function getActiveSeasonYear(): Promise<number> {
  try {
    const data = await jolpicaGet("/current.json", "calendar");
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
  const data = await jolpicaGet("/seasons.json?limit=100", "seasons");
  return (data.SeasonTable?.Seasons ?? []).map((s) => s.season).reverse();
}

export async function getSeasonCalendar(
  season: number | "current" = "current",
): Promise<Race[]> {
  const data = await jolpicaGet(`/${seasonPath(season)}.json`, "calendar");
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
    "standings",
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
    "standings",
  );
  return data.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings ?? [];
}

export async function getLastRace(
  season: number | "current" = "current",
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/last/results.json`,
    "raceResult",
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

export async function getRaceResults(
  season: number,
  round: number,
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${season}/${round}/results.json`,
    "raceResult",
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

/** All race results for a season (used for calendar podiums). */
export async function getSeasonRaceResults(
  season: number | "current" = "current",
): Promise<Race[]> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/results.json?limit=100`,
    "raceResult",
  );
  return data.RaceTable?.Races ?? [];
}

export type PodiumSlot = {
  position: "1" | "2" | "3";
  driverId: string;
  code: string;
  name: string;
  constructorId: string;
  constructorName: string;
  /** Race time for P1, or gap for P2/P3 when available. */
  detail: string;
};

/** Top-three finishers for each round that has results. */
export function podiumByRound(races: Race[]): Map<string, PodiumSlot[]> {
  const map = new Map<string, PodiumSlot[]>();
  for (const race of races) {
    const top = (race.Results ?? [])
      .filter((r) => ["1", "2", "3"].includes(r.position))
      .sort((a, b) => Number(a.position) - Number(b.position))
      .slice(0, 3)
      .map((r): PodiumSlot => {
        const code =
          r.Driver.code ??
          r.Driver.familyName.slice(0, 3).toUpperCase();
        let detail = "—";
        if (r.Time?.time) {
          detail =
            r.position === "1" || r.Time.time.startsWith("+")
              ? r.Time.time
              : `+${r.Time.time}`;
        } else if (r.status && r.status !== "Finished") {
          detail = r.status;
        }
        return {
          position: r.position as "1" | "2" | "3",
          driverId: r.Driver.driverId,
          code,
          name: `${r.Driver.givenName} ${r.Driver.familyName}`,
          constructorId: r.Constructor.constructorId,
          constructorName: r.Constructor.name,
          detail,
        };
      });
    if (top.length) map.set(race.round, top);
  }
  return map;
}

export async function getQualifying(
  season: number,
  round: number,
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${season}/${round}/qualifying.json`,
    "raceResult",
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

export async function getSprintResults(
  season: number,
  round: number,
): Promise<Race | null> {
  const data = await jolpicaGet(
    `/${season}/${round}/sprint.json`,
    "raceResult",
  );
  return data.RaceTable?.Races?.[0] ?? null;
}

/** Calendar row + race/quali/sprint payloads for a weekend. */
export async function getRaceWeekend(season: number, round: number) {
  const [calendar, race, quali, sprint] = await Promise.all([
    getSeasonCalendar(season)
      .then((races) => races.find((r) => r.round === String(round)) ?? null)
      .catch(() => null),
    getRaceResults(season, round).catch(() => null),
    getQualifying(season, round).catch(() => null),
    getSprintResults(season, round).catch(() => null),
  ]);

  return {
    schedule: calendar,
    race,
    quali,
    sprint,
    meta: race ?? quali ?? sprint ?? calendar,
  };
}

export async function getDriver(driverId: string) {
  const data = await jolpicaGet(`/drivers/${driverId}.json`, "circuits");
  return data.DriverTable?.Drivers?.[0] ?? null;
}

/** Recent race results for a driver (newest first). */
export async function getDriverRecentResults(
  driverId: string,
  season: number | "current" = "current",
  limit = 5,
): Promise<
  Array<{
    round: string;
    raceName: string;
    date: string;
    position: string;
    points: string;
    status: string;
    grid: string;
  }>
> {
  // Jolpica returns rounds ascending; pull the season then take the newest N.
  const data = await jolpicaGet(
    `/${seasonPath(season)}/drivers/${driverId}/results.json?limit=30`,
    "raceResult",
  );
  const races = data.RaceTable?.Races ?? [];
  return races
    .slice(-limit)
    .reverse()
    .map((race) => {
      const result = race.Results?.[0];
      return {
        round: race.round,
        raceName: race.raceName,
        date: race.date,
        position: result?.position ?? "—",
        points: result?.points ?? "0",
        status: result?.status ?? "—",
        grid: result?.grid ?? "—",
      };
    });
}

export async function getConstructor(constructorId: string) {
  const data = await jolpicaGet(
    `/constructors/${constructorId}.json`,
    "circuits",
  );
  return data.ConstructorTable?.Constructors?.[0] ?? null;
}

/** Recent race points for a constructor (newest first). */
export async function getConstructorRecentResults(
  constructorId: string,
  season: number | "current" = "current",
  limit = 5,
): Promise<
  Array<{
    round: string;
    raceName: string;
    date: string;
    points: number;
    bestFinish: string;
  }>
> {
  const data = await jolpicaGet(
    `/${seasonPath(season)}/constructors/${constructorId}/results.json?limit=30`,
    "raceResult",
  );
  const races = data.RaceTable?.Races ?? [];
  return races
    .slice(-limit)
    .reverse()
    .map((race) => {
      const results = race.Results ?? [];
      const points = results.reduce(
        (sum, r) => sum + (Number.parseFloat(r.points) || 0),
        0,
      );
      const best = results
        .map((r) => Number.parseInt(r.position, 10))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b)[0];
      return {
        round: race.round,
        raceName: race.raceName,
        date: race.date,
        points,
        bestFinish: best != null ? String(best) : "—",
      };
    });
}

export async function getCircuit(circuitId: string) {
  const data = await jolpicaGet(`/circuits/${circuitId}.json`, "circuits");
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
