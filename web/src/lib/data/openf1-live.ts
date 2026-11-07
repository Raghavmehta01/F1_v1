import { CACHE_TTL } from "@/lib/data/cache";
import {
  OpenF1RateLimitError,
  openf1GetCached,
  openf1PeekCache,
  openf1RateLimitedForSec,
} from "@/lib/data/openf1-http";
import type { OpenF1Driver } from "@/lib/data/openf1";

export type OpenF1Session = {
  session_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_short_name: string;
  country_name: string;
  location: string;
  year: number;
  is_cancelled: boolean;
};

export type LeaderboardRow = {
  position: number;
  driver_number: number;
  name_acronym: string;
  full_name: string;
  team_name: string;
  team_colour: string | null;
  headshot_url: string | null;
  /** Race/sprint gap to car ahead (seconds). */
  interval: number | null;
  /** Race/sprint gap to leader, or practice/quali gap to fastest. */
  gap_to_leader: number | null;
  /** Best flying lap in session (seconds). */
  best_lap: number | null;
  /** Most recent completed lap (seconds). */
  last_lap: number | null;
  laps: number;
};

export type TimingMode = "race" | "laps";

export type LiveSnapshot = {
  session: OpenF1Session;
  status: "live" | "replay" | "upcoming";
  /** race = interval/gap columns; laps = best/last/diff columns */
  timing_mode: TimingMode;
  updated_at: string;
  rows: LeaderboardRow[];
  /** True when serving cached/stale data during upstream pressure. */
  degraded?: boolean;
};

type PositionRow = {
  date: string;
  driver_number: number;
  position: number;
};

type IntervalRow = {
  date: string;
  driver_number: number;
  interval: number | null;
  gap_to_leader: number | null;
};

type LapRow = {
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  is_pit_out_lap: boolean | null;
  date_start: string | null;
};

const snapshotMemory = new Map<
  number,
  { expiresAt: number; staleUntil: number; value: LiveSnapshot }
>();

export async function getSessions(year: number): Promise<OpenF1Session[]> {
  const data = await openf1GetCached<OpenF1Session[]>(
    `/sessions?year=${year}`,
    {
      ttlSec: CACHE_TTL.sessions,
      staleSec: CACHE_TTL.sessionsStale,
    },
  );
  return data.filter((s) => !s.is_cancelled);
}

export async function getSession(
  sessionKey: number,
): Promise<OpenF1Session | null> {
  for (const y of [
    new Date().getUTCFullYear(),
    new Date().getUTCFullYear() - 1,
  ]) {
    const cached = openf1PeekCache<OpenF1Session[]>(`/sessions?year=${y}`);
    const hit = cached?.find((s) => s.session_key === sessionKey);
    if (hit) return hit;
  }

  try {
    const year = new Date().getUTCFullYear();
    const list = await getSessions(year);
    const hit = list.find((s) => s.session_key === sessionKey);
    if (hit) return hit;
  } catch {
    /* fall through */
  }

  const data = await openf1GetCached<OpenF1Session[]>(
    `/sessions?session_key=${sessionKey}`,
    { ttlSec: CACHE_TTL.sessions, staleSec: CACHE_TTL.sessionsStale },
  );
  return data[0] ?? null;
}

/** Live window: 20 min before start through 20 min after scheduled end. */
export function sessionStatus(
  session: OpenF1Session,
  now = Date.now(),
): "live" | "replay" | "upcoming" {
  const start = Date.parse(session.date_start) - 20 * 60 * 1000;
  const end = Date.parse(session.date_end) + 20 * 60 * 1000;
  if (now < start) return "upcoming";
  if (now > end) return "replay";
  return "live";
}

function latestByDriver<T extends { driver_number: number; date: string }>(
  rows: T[],
): Map<number, T> {
  const map = new Map<number, T>();
  for (const row of rows) {
    const prev = map.get(row.driver_number);
    if (!prev || prev.date < row.date) map.set(row.driver_number, row);
  }
  return map;
}

/** Race > Sprint > Qualifying > Sprint Qualifying > Practice. */
export function sessionPriority(session: OpenF1Session): number {
  const label = `${session.session_name} ${session.session_type}`.toLowerCase();
  if (label.includes("race") && !label.includes("sprint")) return 0;
  if (
    label.includes("sprint") &&
    !label.includes("qual") &&
    !label.includes("shootout")
  )
    return 1;
  if (
    label.includes("sprint qualifying") ||
    label.includes("sprint shootout") ||
    (label.includes("sprint") && label.includes("qual"))
  )
    return 2;
  if (label.includes("qualifying") || label.includes("qual")) return 3;
  if (label.includes("practice") || /\bfp[1-3]\b/.test(label)) return 4;
  return 5;
}

function isRaceLike(session: OpenF1Session): boolean {
  const label = `${session.session_name} ${session.session_type}`.toLowerCase();
  if (label.includes("qual")) return false;
  if (label.includes("practice") || /\bfp[1-3]\b/.test(label)) return false;
  return label.includes("race") || label.includes("sprint");
}

type LapStats = {
  best: number | null;
  last: number | null;
  count: number;
};

function lapStatsByDriver(laps: LapRow[]): Map<number, LapStats> {
  const map = new Map<number, LapStats>();
  for (const lap of laps) {
    const dur = lap.lap_duration;
    if (dur == null || !(dur > 0)) continue;
    // Pit-out laps are usually not representative bests.
    if (lap.is_pit_out_lap) {
      const cur = map.get(lap.driver_number) ?? {
        best: null,
        last: null,
        count: 0,
      };
      cur.last = dur;
      cur.count += 1;
      map.set(lap.driver_number, cur);
      continue;
    }
    const cur = map.get(lap.driver_number) ?? {
      best: null,
      last: null,
      count: 0,
    };
    cur.last = dur;
    cur.count += 1;
    if (cur.best == null || dur < cur.best) cur.best = dur;
    map.set(lap.driver_number, cur);
  }
  return map;
}

function buildRows(
  drivers: OpenF1Driver[],
  positions: PositionRow[],
  intervals: IntervalRow[],
  laps: LapRow[],
  preferLaps: boolean,
): LeaderboardRow[] {
  const latestPos = latestByDriver(positions);
  const latestInt = latestByDriver(intervals);
  const stats = lapStatsByDriver(laps);

  const base = drivers.map((d) => {
    const pos = latestPos.get(d.driver_number);
    const gap = latestInt.get(d.driver_number);
    const lap = stats.get(d.driver_number);
    return {
      position: pos?.position ?? 99,
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      full_name: d.full_name,
      team_name: d.team_name,
      team_colour: d.team_colour,
      headshot_url: d.headshot_url,
      interval: gap?.interval ?? null,
      gap_to_leader: gap?.gap_to_leader ?? null,
      best_lap: lap?.best ?? null,
      last_lap: lap?.last ?? null,
      laps: lap?.count ?? 0,
    };
  });

  if (preferLaps) {
    const withBest = base.filter((r) => r.best_lap != null);
    const leaderBest = withBest.reduce(
      (min, r) => Math.min(min, r.best_lap!),
      Number.POSITIVE_INFINITY,
    );
    const ranked = withBest
      .map((r) => ({
        ...r,
        gap_to_leader:
          r.best_lap != null && Number.isFinite(leaderBest)
            ? r.best_lap - leaderBest
            : null,
      }))
      .sort((a, b) => (a.best_lap ?? 9e9) - (b.best_lap ?? 9e9))
      .map((r, i) => ({ ...r, position: i + 1 }));

    // Keep drivers without a flying lap at the bottom by track position.
    const noBest = base
      .filter((r) => r.best_lap == null)
      .sort((a, b) => a.position - b.position)
      .map((r, i) => ({ ...r, position: ranked.length + i + 1 }));

    return [...ranked, ...noBest];
  }

  return base
    .filter((r) => r.position < 99)
    .sort((a, b) => a.position - b.position);
}

export async function getLiveSnapshot(
  sessionKey: number,
): Promise<LiveSnapshot> {
  const now = Date.now();
  const cached = snapshotMemory.get(sessionKey);
  if (cached && cached.expiresAt > now) return cached.value;

  if (openf1RateLimitedForSec() > 0 && cached && cached.staleUntil > now) {
    return { ...cached.value, degraded: true };
  }

  const session = await getSession(sessionKey);
  if (!session) {
    throw new Error(`Session ${sessionKey} not found`);
  }

  const status = sessionStatus(session);
  const ttl =
    status === "live" ? CACHE_TTL.liveTiming : CACHE_TTL.replayTiming;
  const staleSec =
    status === "live" ? CACHE_TTL.liveTimingStale : CACHE_TTL.replayTimingStale;
  const raceLike = isRaceLike(session);

  try {
    const drivers = await openf1GetCached<OpenF1Driver[]>(
      `/drivers?session_key=${sessionKey}`,
      { ttlSec: Math.max(ttl, 30), staleSec: staleSec * 2 },
    );

    const positions = await openf1GetCached<PositionRow[]>(
      `/position?session_key=${sessionKey}`,
      { ttlSec: ttl, staleSec },
    );

    const startMs = Date.parse(session.date_start);
    const endMs = Date.parse(session.date_end);
    const liveBucket = Math.floor(Date.now() / 60_000) * 60_000;
    const windowStart = new Date(
      status === "live"
        ? Math.max(startMs, liveBucket - 12 * 60 * 1000)
        : Math.max(startMs, endMs - 30 * 60 * 1000),
    ).toISOString();

    let intervals: IntervalRow[] = [];
    if (raceLike) {
      try {
        intervals = await openf1GetCached<IntervalRow[]>(
          `/intervals?session_key=${sessionKey}&date>=${encodeURIComponent(windowStart)}`,
          { ttlSec: ttl, staleSec },
        );
      } catch {
        intervals = [];
      }
    }

    let laps: LapRow[] = [];
    try {
      laps = await openf1GetCached<LapRow[]>(
        `/laps?session_key=${sessionKey}`,
        { ttlSec: ttl, staleSec },
      );
    } catch {
      laps = [];
    }

    const hasRaceGaps = intervals.some(
      (r) => r.gap_to_leader != null || r.interval != null,
    );
    const preferLaps = !raceLike || !hasRaceGaps;
    const timing_mode: TimingMode = preferLaps ? "laps" : "race";

    const snapshot: LiveSnapshot = {
      session,
      status,
      timing_mode,
      updated_at: new Date().toISOString(),
      rows: buildRows(drivers, positions, intervals, laps, preferLaps),
    };

    snapshotMemory.set(sessionKey, {
      value: snapshot,
      expiresAt: Date.now() + ttl * 1000,
      staleUntil: Date.now() + staleSec * 1000,
    });
    return snapshot;
  } catch (e) {
    if (cached && cached.staleUntil > Date.now()) {
      return { ...cached.value, degraded: true };
    }
    throw e;
  }
}

export type SessionWithStatus = OpenF1Session & {
  status: "live" | "replay" | "upcoming";
};

export async function getSessionsWithStatus(
  year: number,
): Promise<SessionWithStatus[]> {
  const sessions = await getSessions(year);
  const now = Date.now();
  return sessions
    .map((s) => ({ ...s, status: sessionStatus(s, now) }))
    .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start));
}

/**
 * Pick the OpenF1 season year from live API data (not a hardcoded constant).
 * Prefers a year with a live session, else recent/upcoming activity.
 */
export async function resolveOpenF1Season(
  hint?: number | null,
): Promise<number> {
  const utcYear = new Date().getUTCFullYear();
  const candidates = [
    ...new Set(
      [hint, utcYear, utcYear + 1, utcYear - 1].filter(
        (y): y is number => typeof y === "number" && Number.isFinite(y),
      ),
    ),
  ];

  const now = Date.now();
  let bestYear = utcYear;
  let bestScore = -1;

  for (const year of candidates) {
    let sessions: OpenF1Session[] = [];
    try {
      sessions = await getSessions(year);
    } catch {
      continue;
    }
    if (!sessions.length) continue;

    let score = 1;
    for (const s of sessions) {
      const st = sessionStatus(s, now);
      if (st === "live") score = Math.max(score, 1000);
      else if (st === "upcoming") {
        const mins = (Date.parse(s.date_start) - now) / 60_000;
        if (mins >= -30 && mins <= 60 * 48) score = Math.max(score, 400);
      } else {
        const ageH = (now - Date.parse(s.date_end)) / 3_600_000;
        if (ageH >= 0 && ageH <= 72) score = Math.max(score, 300 - ageH);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestYear = year;
    }
  }

  return bestYear;
}

export async function pickDefaultSession(
  year?: number | null,
): Promise<OpenF1Session | null> {
  const season = year ?? (await resolveOpenF1Season());
  const sessions = await getSessionsWithStatus(season);

  const live = sessions
    .filter((s) => s.status === "live")
    .sort((a, b) => sessionPriority(a) - sessionPriority(b));
  if (live[0]) return live[0];

  const finished = sessions
    .filter((s) => s.status === "replay")
    .sort((a, b) => Date.parse(b.date_end) - Date.parse(a.date_end));

  return finished[0] ?? sessions[0] ?? null;
}

export type PracticeBoard = {
  id: "fp1" | "fp2" | "fp3";
  label: string;
  session_name: string;
  session_key: number;
  rows: LeaderboardRow[];
};

function circuitHaystack(session: OpenF1Session): string {
  return `${session.circuit_short_name} ${session.location} ${session.country_name}`.toLowerCase();
}

function raceCircuitHints(race: {
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
}): string[] {
  return [
    race.Circuit.circuitId,
    race.Circuit.circuitName,
    race.Circuit.Location.locality,
    race.Circuit.Location.country,
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

function matchesCircuit(
  session: OpenF1Session,
  hints: string[],
): boolean {
  const hay = circuitHaystack(session);
  return hints.some(
    (h) =>
      hay.includes(h) ||
      h.includes(session.circuit_short_name.toLowerCase()) ||
      h.includes(session.location.toLowerCase()),
  );
}

async function getLapBoard(sessionKey: number): Promise<LeaderboardRow[]> {
  const drivers = await openf1GetCached<OpenF1Driver[]>(
    `/drivers?session_key=${sessionKey}`,
    { ttlSec: CACHE_TTL.replayTiming, staleSec: CACHE_TTL.replayTimingStale },
  );
  let laps: LapRow[] = [];
  try {
    laps = await openf1GetCached<LapRow[]>(`/laps?session_key=${sessionKey}`, {
      ttlSec: CACHE_TTL.replayTiming,
      staleSec: CACHE_TTL.replayTimingStale,
    });
  } catch {
    laps = [];
  }
  return buildRows(drivers, [], [], laps, true);
}

/** FP1–FP3 lap boards for a Jolpica race weekend (via OpenF1). */
export async function getWeekendPracticeBoards(race: {
  season: string;
  date: string;
  FirstPractice?: { date: string };
  SecondPractice?: { date: string };
  ThirdPractice?: { date: string };
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
}): Promise<PracticeBoard[]> {
  const year = Number.parseInt(race.season, 10);
  if (!Number.isFinite(year)) return [];

  let sessions: OpenF1Session[] = [];
  try {
    sessions = await getSessions(year);
  } catch {
    return [];
  }

  const hints = raceCircuitHints(race);
  const windowStart = race.FirstPractice?.date ?? race.date;
  const windowEnd = race.date;

  const practices = sessions
    .filter((s) => {
      const name = s.session_name.toLowerCase();
      if (!name.includes("practice")) return false;
      const day = s.date_start.slice(0, 10);
      if (day < windowStart || day > windowEnd) return false;
      return matchesCircuit(s, hints);
    })
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start));

  const out: PracticeBoard[] = [];
  for (const session of practices) {
    const name = session.session_name.toLowerCase();
    const id: PracticeBoard["id"] = name.includes("3")
      ? "fp3"
      : name.includes("2")
        ? "fp2"
        : "fp1";
    const label = id.toUpperCase();
    try {
      const rows = await getLapBoard(session.session_key);
      out.push({
        id,
        label,
        session_name: session.session_name,
        session_key: session.session_key,
        rows,
      });
    } catch {
      out.push({
        id,
        label,
        session_name: session.session_name,
        session_key: session.session_key,
        rows: [],
      });
    }
  }

  // De-dupe if OpenF1 returns duplicates for the same FP slot.
  const seen = new Set<string>();
  return out.filter((b) => {
    if (seen.has(b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

export { OpenF1RateLimitError, openf1RateLimitedForSec };
