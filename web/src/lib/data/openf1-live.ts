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
  /** Current tyre compound from OpenF1 stints when available. */
  compound?: string | null;
};

/**
 * How the board is ranked / which columns matter:
 * - race: race/sprint order + interval/gap
 * - classification: official session order (quali/sprint quali pole order)
 * - laps: practice-style best-lap order
 */
export type TimingMode = "race" | "classification" | "laps";

export type SessionKind =
  | "race"
  | "sprint"
  | "qualifying"
  | "practice"
  | "other";

/** Active quali segment for UI (Q1/Q2/Q3 or final pole order). */
export type QualiSegment = "Q1" | "Q2" | "Q3" | "SQ1" | "SQ2" | "SQ3" | "Final";

export type LiveSnapshot = {
  session: OpenF1Session;
  status: "live" | "replay" | "upcoming";
  timing_mode: TimingMode;
  /** Set for qualifying / sprint quali boards. */
  quali_segment?: QualiSegment | null;
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

type RaceControlRow = {
  date: string;
  category: string | null;
  message: string | null;
  qualifying_phase: number | null;
};

type SessionResultRow = {
  position: number;
  driver_number: number;
  number_of_laps: number | null;
  duration: number | number[] | null;
  gap_to_leader: number | number[] | string | null;
  dnf?: boolean;
  dns?: boolean;
  dsq?: boolean;
};

type StintRow = {
  driver_number: number;
  stint_number: number;
  compound: string | null;
  lap_start: number | null;
  lap_end: number | null;
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

function sessionLabel(session: OpenF1Session): string {
  return `${session.session_name} ${session.session_type}`.toLowerCase();
}

/** Classify OpenF1 session for ranking rules. */
export function sessionKind(session: OpenF1Session): SessionKind {
  const label = sessionLabel(session);
  if (
    label.includes("sprint qualifying") ||
    label.includes("sprint shootout") ||
    (label.includes("sprint") && label.includes("qual"))
  ) {
    return "qualifying";
  }
  if (label.includes("qualifying") || label.includes("qual")) {
    return "qualifying";
  }
  if (label.includes("practice") || /\bfp[1-3]\b/.test(label)) {
    return "practice";
  }
  if (
    label.includes("sprint") &&
    !label.includes("qual") &&
    !label.includes("shootout")
  ) {
    return "sprint";
  }
  if (label.includes("race")) return "race";
  return "other";
}

function isRaceLike(session: OpenF1Session): boolean {
  const kind = sessionKind(session);
  return kind === "race" || kind === "sprint";
}

/** Pick ranking mode from session type + whether race gaps exist. */
export function resolveTimingMode(
  session: OpenF1Session,
  hasRaceGaps: boolean,
): TimingMode {
  const kind = sessionKind(session);
  if (kind === "practice") return "laps";
  if (kind === "qualifying") return "classification";
  if (kind === "race" || kind === "sprint") {
    return hasRaceGaps ? "race" : "classification";
  }
  // Unknown: prefer official positions when present later; default classification.
  return "classification";
}

function isSprintQualiSession(session: OpenF1Session): boolean {
  const label = sessionLabel(session);
  return (
    label.includes("sprint qualifying") ||
    label.includes("sprint shootout") ||
    (label.includes("sprint") && label.includes("qual"))
  );
}

function segmentLabel(
  phase: 1 | 2 | 3,
  sprintQuali: boolean,
): QualiSegment {
  if (sprintQuali) {
    return phase === 1 ? "SQ1" : phase === 2 ? "SQ2" : "SQ3";
  }
  return phase === 1 ? "Q1" : phase === 2 ? "Q2" : "Q3";
}

/**
 * Infer current/final quali segment from OpenF1 race_control.
 * Uses qualifying_phase 1/2/3 + SESSION STARTED / FINISHED / CHEQUERED.
 */
export function inferQualiSegment(
  raceControl: RaceControlRow[],
  opts: {
    sessionStatus: "live" | "replay" | "upcoming";
    sprintQuali: boolean;
    nowMs?: number;
  },
): {
  segment: QualiSegment;
  phase: 1 | 2 | 3 | null;
  windowStartMs: number | null;
  windowEndMs: number | null;
} {
  const now = opts.nowMs ?? Date.now();
  const events = [...raceControl]
    .filter((e) => e.qualifying_phase === 1 || e.qualifying_phase === 2 || e.qualifying_phase === 3)
    .map((e) => ({
      ...e,
      phase: e.qualifying_phase as 1 | 2 | 3,
      t: Date.parse(e.date),
    }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);

  if (!events.length) {
    return {
      segment: opts.sessionStatus === "replay" ? "Final" : segmentLabel(1, opts.sprintQuali),
      phase: opts.sessionStatus === "replay" ? null : 1,
      windowStartMs: null,
      windowEndMs: null,
    };
  }

  type PhaseState = { start: number | null; end: number | null };
  const phases: Record<1 | 2 | 3, PhaseState> = {
    1: { start: null, end: null },
    2: { start: null, end: null },
    3: { start: null, end: null },
  };

  for (const e of events) {
    const msg = (e.message ?? "").toUpperCase();
    if (msg.includes("SESSION STARTED") || msg.includes("GREEN LIGHT")) {
      if (phases[e.phase].start == null) phases[e.phase].start = e.t;
    }
    if (msg.includes("SESSION FINISHED") || msg.includes("CHEQUERED")) {
      phases[e.phase].end = e.t;
    }
  }

  // Finished session → always final classification.
  if (opts.sessionStatus === "replay") {
    return {
      segment: "Final",
      phase: null,
      windowStartMs: phases[3].start ?? phases[1].start,
      windowEndMs: phases[3].end ?? phases[2].end ?? phases[1].end,
    };
  }

  // Live / upcoming: pick active phase at `now`.
  let active: 1 | 2 | 3 = 1;
  for (const p of [1, 2, 3] as const) {
    const st = phases[p];
    if (st.start != null && st.start <= now && (st.end == null || now <= st.end + 60_000)) {
      active = p;
    } else if (st.start != null && st.start <= now) {
      active = p; // between segments, keep last started
    }
  }

  // If Q3 has finished, treat as Final even if outer session window still "live".
  if (phases[3].end != null && now >= phases[3].end) {
    return {
      segment: "Final",
      phase: null,
      windowStartMs: phases[3].start,
      windowEndMs: phases[3].end,
    };
  }

  const st = phases[active];
  return {
    segment: segmentLabel(active, opts.sprintQuali),
    phase: active,
    windowStartMs: st.start,
    windowEndMs: st.end ?? now + 60_000,
  };
}

function pickQualiDuration(duration: number | number[] | null): number | null {
  if (duration == null) return null;
  if (typeof duration === "number") return Number.isFinite(duration) ? duration : null;
  for (let i = duration.length - 1; i >= 0; i--) {
    const v = duration[i];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function pickQualiGap(
  gap: number | number[] | string | null,
): number | null {
  if (gap == null) return null;
  if (typeof gap === "number") return Number.isFinite(gap) ? gap : null;
  if (typeof gap === "string") return null;
  for (let i = gap.length - 1; i >= 0; i--) {
    const v = gap[i];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function filterLapsInWindow(
  laps: LapRow[],
  startMs: number | null,
  endMs: number | null,
): LapRow[] {
  if (startMs == null) return laps;
  const end = endMs ?? Date.now() + 60_000;
  return laps.filter((lap) => {
    if (!lap.date_start) return false;
    const t = Date.parse(lap.date_start);
    return Number.isFinite(t) && t >= startMs && t <= end;
  });
}

function rowsFromSessionResult(
  drivers: OpenF1Driver[],
  results: SessionResultRow[],
): LeaderboardRow[] {
  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  return [...results]
    .filter((r) => r.position > 0)
    .sort((a, b) => a.position - b.position)
    .map((r) => {
      const d = byNum.get(r.driver_number);
      return {
        position: r.position,
        driver_number: r.driver_number,
        name_acronym: d?.name_acronym ?? String(r.driver_number),
        full_name: d?.full_name ?? `Driver ${r.driver_number}`,
        team_name: d?.team_name ?? "—",
        team_colour: d?.team_colour ?? null,
        headshot_url: d?.headshot_url ?? null,
        interval: null,
        gap_to_leader: pickQualiGap(r.gap_to_leader),
        best_lap: pickQualiDuration(r.duration),
        last_lap: pickQualiDuration(r.duration),
        laps: r.number_of_laps ?? 0,
        compound: null,
      };
    });
}

/** Latest stint compound per driver. */
export function latestCompoundByDriver(
  stints: StintRow[],
): Map<number, string> {
  const map = new Map<number, string>();
  const sorted = [...stints].sort(
    (a, b) => (a.stint_number ?? 0) - (b.stint_number ?? 0),
  );
  for (const s of sorted) {
    if (s.compound) map.set(s.driver_number, s.compound);
  }
  return map;
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

function withBestLapGaps(rows: LeaderboardRow[]): LeaderboardRow[] {
  const withBest = rows.filter((r) => r.best_lap != null);
  if (!withBest.length) return rows;
  const leaderBest = withBest.reduce(
    (min, r) => Math.min(min, r.best_lap!),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(leaderBest)) return rows;
  return rows.map((r) => ({
    ...r,
    gap_to_leader:
      r.best_lap != null ? r.best_lap - leaderBest : r.gap_to_leader,
  }));
}

/** Exported for unit tests — ranks rows by session timing mode. */
export function buildRows(
  drivers: OpenF1Driver[],
  positions: PositionRow[],
  intervals: IntervalRow[],
  laps: LapRow[],
  mode: TimingMode,
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
      compound: null as string | null,
    };
  });

  if (mode === "laps") {
    const withBest = base.filter((r) => r.best_lap != null);
    const ranked = withBestLapGaps(withBest)
      .sort((a, b) => (a.best_lap ?? 9e9) - (b.best_lap ?? 9e9))
      .map((r, i) => ({ ...r, position: i + 1 }));

    const noBest = base
      .filter((r) => r.best_lap == null)
      .sort((a, b) => a.position - b.position)
      .map((r, i) => ({ ...r, position: ranked.length + i + 1 }));

    return [...ranked, ...noBest];
  }

  // race + classification: official position order (pole / race / sprint).
  const ordered = base
    .filter((r) => r.position < 99)
    .sort((a, b) => a.position - b.position);

  if (mode === "classification") {
    // Keep official position order. Gap = delta to P1's displayed best
    // (segment-scoped when caller filtered laps to Q1/Q2/Q3).
    return withBestLapGaps(
      ordered.map((r) => ({
        ...r,
        interval: null,
      })),
    );
  }

  return ordered;
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
    let timing_mode = resolveTimingMode(session, hasRaceGaps);
    let quali_segment: QualiSegment | null = null;
    let rows: LeaderboardRow[];

    if (sessionKind(session) === "qualifying") {
      let raceControl: RaceControlRow[] = [];
      try {
        raceControl = await openf1GetCached<RaceControlRow[]>(
          `/race_control?session_key=${sessionKey}`,
          { ttlSec: Math.min(ttl, 15), staleSec },
        );
      } catch {
        raceControl = [];
      }

      const inferred = inferQualiSegment(raceControl, {
        sessionStatus: status,
        sprintQuali: isSprintQualiSession(session),
      });
      quali_segment = inferred.segment;
      timing_mode = "classification";

      // Finished quali → official pole order from session_result (Q1/Q2/Q3 arrays).
      if (inferred.segment === "Final") {
        let results: SessionResultRow[] = [];
        try {
          results = await openf1GetCached<SessionResultRow[]>(
            `/session_result?session_key=${sessionKey}`,
            { ttlSec: CACHE_TTL.replayTiming, staleSec: CACHE_TTL.replayTimingStale },
          );
        } catch {
          results = [];
        }
        if (results.length) {
          rows = rowsFromSessionResult(drivers, results);
        } else {
          rows = buildRows(drivers, positions, [], laps, "classification");
        }
      } else {
        // Live Q1/Q2/Q3 (or SQ*): live position order + laps in that segment only.
        const segmentLaps = filterLapsInWindow(
          laps,
          inferred.windowStartMs,
          inferred.windowEndMs,
        );
        rows = buildRows(
          drivers,
          positions,
          [],
          segmentLaps.length ? segmentLaps : laps,
          "classification",
        );
      }
    } else {
      rows = buildRows(drivers, positions, intervals, laps, timing_mode);
    }

    let stints: StintRow[] = [];
    try {
      stints = await openf1GetCached<StintRow[]>(
        `/stints?session_key=${sessionKey}`,
        { ttlSec: Math.max(ttl, 20), staleSec },
      );
    } catch {
      stints = [];
    }
    if (stints.length) {
      const compounds = latestCompoundByDriver(stints);
      rows = rows.map((r) => ({
        ...r,
        compound: compounds.get(r.driver_number) ?? r.compound ?? null,
      }));
    }

    const snapshot: LiveSnapshot = {
      session,
      status,
      timing_mode,
      quali_segment,
      updated_at: new Date().toISOString(),
      rows,
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
  return buildRows(drivers, [], [], laps, "laps");
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
