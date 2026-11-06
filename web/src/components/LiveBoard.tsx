"use client";

import { DriverAvatar } from "@/components/DriverAvatar";
import type { LiveSnapshot, SessionWithStatus } from "@/lib/openf1-live";
import { useCallback, useEffect, useState, useTransition } from "react";

function formatGap(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "LED";
  return `+${n.toFixed(3)}`;
}

function formatInterval(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `+${n.toFixed(3)}`;
}

export function LiveBoard({
  initial,
  sessions,
}: {
  initial: LiveSnapshot | null;
  sessions: SessionWithStatus[];
}) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(initial);
  const [sessionKey, setSessionKey] = useState<number | null>(
    initial?.session.session_key ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (key: number) => {
    const res = await fetch(`/api/live?session_key=${key}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as LiveSnapshot;
  }, []);

  useEffect(() => {
    if (sessionKey == null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const next = await load(sessionKey);
        if (cancelled) return;
        setSnapshot(next);
        setError(null);
        timer = setTimeout(tick, next.status === "live" ? 4000 : 60_000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Feed error");
        timer = setTimeout(tick, 8000);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionKey, load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 border border-[var(--line)] bg-[var(--bg-elevated)] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em]">
            {snapshot?.status === "live" ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--live)] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--live)]" />
                </span>
                <span className="text-[var(--live)]">Live</span>
              </>
            ) : snapshot?.status === "upcoming" ? (
              <span className="text-[var(--muted)]">Upcoming</span>
            ) : (
              <span className="text-[var(--muted)]">Replay</span>
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
              if (Number.isFinite(key)) startTransition(() => setSessionKey(key));
            }}
          >
            {sessions.map((s) => (
              <option key={s.session_key} value={s.session_key}>
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
        <p className="text-[var(--muted)]">No timing rows for this session yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table min-w-[44rem]">
            <thead>
              <tr>
                <th className="w-14">Pos</th>
                <th>Driver</th>
                <th>Team</th>
                <th className="font-mono">Interval</th>
                <th className="font-mono">Gap</th>
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
                        <span className="block font-medium">{row.full_name}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-[var(--muted)]">{row.team_name}</td>
                  <td className="font-mono">
                    {row.position === 1 ? "—" : formatInterval(row.interval)}
                  </td>
                  <td className="font-mono text-[var(--live)]">
                    {formatGap(row.gap_to_leader)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {snapshot ? (
        <p className="font-mono text-[11px] text-[var(--muted)]">
          {snapshot.updated_at.replace("T", " ").replace(/\.\d+Z$/, " UTC")}
          {snapshot.status === "live"
            ? " · polling 4s"
            : " · replay refresh 60s"}
        </p>
      ) : null}
    </div>
  );
}
