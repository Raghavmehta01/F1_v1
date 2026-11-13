"use client";

import { useEffect, useState } from "react";
import type { RaceSessionSlot } from "@/lib/data/race-sessions";

/** Build day/time from parts so SSR/client ICU quirks can't diverge. */
function formatParts(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "—", time: "—" };
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).formatToParts(d);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "";
    const day = [get("weekday"), get("day"), get("month")].filter(Boolean).join(" ");
    const time = `${get("hour")}:${get("minute")}`;
    return { day, time };
  } catch {
    return { day: "—", time: "—" };
  }
}

function zoneLabel(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

export function RaceWeekendTimes({
  sessions,
}: {
  sessions: RaceSessionSlot[];
}) {
  const [localTz, setLocalTz] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setLocalTz("UTC");
    }
  }, []);

  if (!sessions.length) return null;

  // Wait for client TZ so local day strings never hydrate-mismatch.
  if (!localTz) {
    return (
      <div className="animate-hero-rise-delay w-full max-w-xl space-y-2">
        <p className="eyebrow !normal-case tracking-[0.16em]">Weekend times</p>
        <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 py-2 text-sm"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {s.label}
              </span>
              <span className="font-mono text-[var(--muted)]">—</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const localShort = zoneLabel(localTz);

  return (
    <div className="animate-hero-rise-delay w-full max-w-xl space-y-2">
      <div className="flex items-end justify-between gap-3">
        <p className="eyebrow !normal-case tracking-[0.16em]">Weekend times</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
          {localShort} · UTC
        </p>
      </div>
      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {sessions.map((s) => {
          const local = formatParts(s.at, localTz);
          const utc = formatParts(s.at, "UTC");
          return (
            <li
              key={s.id}
              className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 text-sm"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {s.label}
              </span>
              <span className="min-w-0 text-[var(--ink)]">
                <span className="font-medium">{local.day}</span>
                <span className="text-[var(--muted)]"> · </span>
                <span className="font-mono">{local.time}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                {utc.time} UTC
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
