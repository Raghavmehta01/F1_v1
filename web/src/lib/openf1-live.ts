import { CACHE_TTL } from "@/lib/cache";
import { safeFetch } from "@/lib/security";
import type { OpenF1Driver } from "@/lib/openf1";

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
  interval: number | null;
  gap_to_leader: number | null;
};

export type LiveSnapshot = {
  session: OpenF1Session;
  status: "live" | "replay" | "upcoming";
  updated_at: string;
  rows: LeaderboardRow[];
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

async function openf1Get<T>(
  path: string,
  revalidate: number | false,
): Promise<T> {
  const url = `https://api.openf1.org/v1${path}`;
  const res = await safeFetch(url, {
    headers: { Accept: "application/json" },
    ...(revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate } }),
  });
  if (!res.ok) {
    throw new Error(`OpenF1 ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getSessions(year: number): Promise<OpenF1Session[]> {
  const data = await openf1Get<OpenF1Session[]>(
    `/sessions?year=${year}`,
    CACHE_TTL.calendar,
  );
  return data.filter((s) => !s.is_cancelled);
}

export async function getSession(sessionKey: number): Promise<OpenF1Session | null> {
  const data = await openf1Get<OpenF1Session[]>(
    `/sessions?session_key=${sessionKey}`,
    CACHE_TTL.calendar,
  );
  return data[0] ?? null;
}

export function sessionStatus(
  session: OpenF1Session,
  now = Date.now(),
): "live" | "replay" | "upcoming" {
  const start = Date.parse(session.date_start) - 30 * 60 * 1000;
  const end = Date.parse(session.date_end) + 30 * 60 * 1000;
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

export async function getLiveSnapshot(
  sessionKey: number,
): Promise<LiveSnapshot> {
  const session = await getSession(sessionKey);
  if (!session) {
    throw new Error(`Session ${sessionKey} not found`);
  }

  const status = sessionStatus(session);
  const revalidate = status === "live" ? CACHE_TTL.live : CACHE_TTL.raceResult;

  const drivers = await openf1Get<OpenF1Driver[]>(
    `/drivers?session_key=${sessionKey}`,
    revalidate,
  );

  const positions = await openf1Get<PositionRow[]>(
    `/position?session_key=${sessionKey}`,
    status === "live" ? false : revalidate,
  );
  const latestPos = latestByDriver(positions);

  // Narrow intervals near session end (or last 2 minutes of data window) to cut payload.
  const endMs = Date.parse(session.date_end);
  const windowStart = new Date(
    Math.max(Date.parse(session.date_start), endMs - 15 * 60 * 1000),
  ).toISOString();

  let intervals: IntervalRow[] = [];
  try {
    intervals = await openf1Get<IntervalRow[]>(
      `/intervals?session_key=${sessionKey}&date>=${encodeURIComponent(windowStart)}`,
      status === "live" ? false : revalidate,
    );
  } catch {
    intervals = [];
  }
  const latestInt = latestByDriver(intervals);

  const rows: LeaderboardRow[] = drivers
    .map((d) => {
      const pos = latestPos.get(d.driver_number);
      const gap = latestInt.get(d.driver_number);
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
      };
    })
    .filter((r) => r.position < 99)
    .sort((a, b) => a.position - b.position);

  return {
    session,
    status,
    updated_at: new Date().toISOString(),
    rows,
  };
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

/** Best default session: live if any, else most recent finished race-like session. */
export async function pickDefaultSession(
  year: number,
): Promise<OpenF1Session | null> {
  const sessions = await getSessionsWithStatus(year);
  const live = sessions.find((s) => s.status === "live");
  if (live) return live;

  const preferred = ["Race", "Sprint", "Qualifying", "Sprint Qualifying"];
  const finished = sessions.filter((s) => s.status === "replay");

  for (const type of preferred) {
    const hit = finished.find(
      (s) => s.session_name === type || s.session_type === type,
    );
    if (hit) return hit;
  }
  return finished[0] ?? sessions[0] ?? null;
}
