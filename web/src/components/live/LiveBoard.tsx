"use client";

import { DriverAvatar } from "@/components/standings/DriverAvatar";
import type { LiveSnapshot, SessionWithStatus } from "@/lib/data/openf1-live";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const POLL_LIVE_MS = 10_000;
const POLL_IDLE_MS = 60_000;
const POLL_MANUAL_REPLAY_MS = 120_000;
const SESSIONS_REFRESH_MS = 90_000;
const BACKOFF_CAP_MS = 120_000;

function formatGap(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "LED";
  return `+${n.toFixed(3)}`;
}

function formatInterval(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `+${n.toFixed(3)}`;
}

function formatLap(sec: number | null): string {
  if (sec == null || Number.isNaN(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  if (m <= 0) return s.toFixed(3);
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

function statusLabel(status: LiveSnapshot["status"]) {
  if (status === "live") return "Live now";
  if (status === "upcoming") return "Upcoming";
  return "Latest result";
}

function retryAfterMs(res: Response, body: { retry_after?: number } | null) {
  const header = res.headers.get("retry-after");
  if (header) {
    const n = Number.parseInt(header, 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n * 1000, BACKOFF_CAP_MS);
  }
  if (body?.retry_after && body.retry_after > 0) {
    return Math.min(body.retry_after * 1000, BACKOFF_CAP_MS);
  }
  return 20_000;
}

export function LiveBoard({
  initial,
  sessions: initialSessions,
  season: initialSeason,
}: {
  initial: LiveSnapshot | null;
  sessions: SessionWithStatus[];
  season: number;
}) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(initial);
  const [sessionList, setSessionList] =
    useState<SessionWithStatus[]>(initialSessions);
  const [season, setSeason] = useState(initialSeason);
  const [sessionKey, setSessionKey] = useState<number | null>(
    initial?.session.session_key ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [followLive, setFollowLive] = useState(true);
  const followLiveRef = useRef(true);
  followLiveRef.current = followLive;
  const backoffMs = useRef(0);

  // Keep the dropdown in sync with OpenF1 (no frozen SSR list).
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/live/sessions?season=${season}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          season?: number;
          sessions?: SessionWithStatus[];
        };
        if (cancelled) return;
        if (body.season) setSeason(body.season);
        if (body.sessions?.length) setSessionList(body.sessions);
      } catch {
        /* ignore — timing poll is the critical path */
      }
    };
    void refresh();
    const id = window.setInterval(refresh, SESSIONS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [season]);

  const load = useCallback(async (key: number) => {
    const res = await fetch(`/api/live?session_key=${key}`, {
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      retry_after?: number;
    } | null;
    if (res.status === 429) {
      const wait = retryAfterMs(res, body);
      const err = new Error(body?.error ?? "Timing feed is rate limited") as Error & {
        retryAfterMs?: number;
      };
      err.retryAfterMs = wait;
      throw err;
    }
    if (!res.ok) {
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return body as unknown as LiveSnapshot;
  }, []);

  const loadDefault = useCallback(async () => {
    const res = await fetch("/api/live", { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as {
      error?: string;
      retry_after?: number;
    } | null;
    if (res.status === 429) {
      const wait = retryAfterMs(res, body);
      const err = new Error(body?.error ?? "Timing feed is rate limited") as Error & {
        retryAfterMs?: number;
      };
      err.retryAfterMs = wait;
      throw err;
    }
    if (!res.ok) {
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return body as unknown as LiveSnapshot;
  }, []);

  useEffect(() => {
    if (sessionKey == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ms: number) => {
      timer = setTimeout(tick, Math.max(ms, 1000));
    };

    const tick = async () => {
      try {
        if (followLiveRef.current) {
          const best = await loadDefault();
          if (cancelled) return;
          backoffMs.current = 0;
          if (best.session.session_key !== sessionKey) {
            setSessionKey(best.session.session_key);
            setSnapshot(best);
            setError(null);
            schedule(best.status === "live" ? POLL_LIVE_MS : POLL_IDLE_MS);
            return;
          }
          setSnapshot(best);
          setError(
            best.degraded
              ? "Timing feed is busy — showing the last good board"
              : null,
          );
          schedule(best.status === "live" ? POLL_LIVE_MS : POLL_IDLE_MS);
          return;
        }

        const next = await load(sessionKey);
        if (cancelled) return;
        backoffMs.current = 0;
        setSnapshot(next);
        setError(
          next.degraded
            ? "Timing feed is busy — showing the last good board"
            : null,
        );
        schedule(
          next.status === "live" ? POLL_LIVE_MS : POLL_MANUAL_REPLAY_MS,
        );
      } catch (e) {
        if (cancelled) return;
        const wait =
          e && typeof e === "object" && "retryAfterMs" in e
            ? Number((e as { retryAfterMs?: number }).retryAfterMs)
            : 0;
        const nextBackoff = Math.min(
          wait > 0 ? wait : backoffMs.current
            ? backoffMs.current * 2
            : 15_000,
          BACKOFF_CAP_MS,
        );
        backoffMs.current = nextBackoff;
        setError(
          e instanceof Error
            ? `${e.message} · retrying in ${Math.ceil(nextBackoff / 1000)}s`
            : "Feed error",
        );
        schedule(nextBackoff);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionKey, load, loadDefault]);

  const liveSessions = sessionList.filter((s) => s.status === "live");
  const headline = snapshot
    ? statusLabel(snapshot.status)
    : liveSessions.length
      ? "Live now"
      : "Latest result";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 border border-[var(--line)] bg-[var(--bg-elevated)] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
            {snapshot?.status === "live" ||
            (!snapshot && liveSessions.length) ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--live)]" />
                </span>
                <span className="text-[var(--live)]">{headline}</span>
              </>
            ) : (
              <span className="text-[var(--muted)]">{headline}</span>
            )}
            {followLive ? (
              <span className="text-[var(--muted)]">· auto</span>
            ) : (
              <button
                type="button"
                className="text-[var(--brand)] hover:underline"
                onClick={() => {
                  setFollowLive(true);
                  startTransition(() => {
                    void loadDefault().then((best) => {
                      setSessionKey(best.session.session_key);
                      setSnapshot(best);
                    });
                  });
                }}
              >
                · follow live
              </button>
            )}
            {pending ? (
              <span className="text-[var(--muted)]">· switching</span>
            ) : null}
          </div>
          {snapshot ? (
            <div>
              <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                {snapshot.session.session_name}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {snapshot.session.circuit_short_name} ·{" "}
                {snapshot.session.country_name}
                {(snapshot.timing_mode ?? "laps") === "laps"
                  ? " · ordered by best lap"
                  : snapshot.status === "live"
                    ? " · live race order + gaps"
                    : " · race order + gaps"}
              </p>
            </div>
          ) : null}
        </div>

        <label className="flex min-w-[16rem] flex-col gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Session
          <select
            className="border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 font-mono text-xs normal-case tracking-normal text-[var(--ink)] outline-none focus:border-[var(--ink)]"
            value={sessionKey ?? ""}
            onChange={(e) => {
              const key = Number.parseInt(e.target.value, 10);
              if (!Number.isFinite(key)) return;
              setFollowLive(false);
              startTransition(() => setSessionKey(key));
            }}
          >
            {sessionList.map((s) => (
              <option key={s.session_key} value={s.session_key}>
                {s.status === "live"
                  ? "● "
                  : s.status === "upcoming"
                    ? "○ "
                    : ""}
                {s.date_start.slice(0, 10)} · {s.session_name} ·{" "}
                {s.circuit_short_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="border border-[var(--brand)]/40 px-4 py-3 text-sm text-[var(--brand)]">
          {error}
        </p>
      ) : null}

      {!snapshot?.rows.length ? (
        <p className="text-[var(--muted)]">
          No timing rows for this session yet — pick another session or check
          back shortly.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[48rem]">
            <thead>
              <tr>
                <th className="w-14">Pos</th>
                <th>Driver</th>
                <th>Team</th>
                {(snapshot.timing_mode ?? "laps") === "laps" ? (
                  <>
                    <th className="font-mono">Best</th>
                    <th className="font-mono">Last</th>
                    <th className="font-mono">Gap</th>
                    <th className="font-mono">Laps</th>
                  </>
                ) : (
                  <>
                    <th className="font-mono">Interval</th>
                    <th className="font-mono">Gap</th>
                    <th className="font-mono">Best</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {snapshot.rows.map((row) => (
                <tr key={row.driver_number}>
                  <td className="font-mono text-base">{row.position}</td>
                  <td>
                    <span className="flex items-center gap-3">
                      <DriverAvatar
                        src={row}
                        alt={row.full_name}
                        size={52}
                        teamHex={row.team_colour}
                      />
                      <span>
                        <span className="font-mono text-[10px] tracking-wider text-[var(--muted)]">
                          {row.name_acronym}
                        </span>
                        <span className="block font-medium">
                          {row.full_name}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="text-[var(--muted)]">{row.team_name}</td>
                  {(snapshot.timing_mode ?? "laps") === "laps" ? (
                    <>
                      <td className="font-mono">
                        {formatLap(row.best_lap ?? null)}
                      </td>
                      <td className="font-mono text-[var(--muted)]">
                        {formatLap(row.last_lap ?? null)}
                      </td>
                      <td className="font-mono text-[var(--live)]">
                        {formatGap(row.gap_to_leader)}
                      </td>
                      <td className="font-mono text-[var(--muted)]">
                        {row.laps || "—"}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-mono">
                        {row.position === 1
                          ? "—"
                          : formatInterval(row.interval)}
                      </td>
                      <td className="font-mono text-[var(--live)]">
                        {formatGap(row.gap_to_leader)}
                      </td>
                      <td className="font-mono text-[var(--muted)]">
                        {formatLap(row.best_lap ?? null)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {snapshot ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          Updated{" "}
          {snapshot.updated_at.replace("T", " ").replace(/\.\d+Z$/, " UTC")}
          {snapshot.degraded ? " · last good copy" : ""}
          {` · ${season}`}
        </p>
      ) : null}
    </div>
  );
}
