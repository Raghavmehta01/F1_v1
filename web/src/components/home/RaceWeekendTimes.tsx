"use client";

import { useEffect, useState } from "react";
import type { RaceSessionSlot } from "@/lib/data/race-sessions";

/** Fixed locale so SSR and client always match. */
const LOCALE = "en-GB";

function formatParts(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: "—", time: "—" };
  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { day, time };
}

function zoneLabel(timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat(LOCALE, {
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

  const tz = localTz ?? "UTC";
  const localShort = localTz ? zoneLabel(localTz) : "…";

  return (
    <div className="animate-hero-rise-delay w-full max-w-xl space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="eyebrow !normal-case tracking-[0.16em]">Weekend times</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
          <span className="sm:hidden">{localShort}</span>
          <span className="hidden sm:inline">
            {localShort} · UTC
          </span>
        </p>
      </div>
      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {sessions.map((s) => {
          const local = formatParts(s.at, tz);
          const utc = formatParts(s.at, "UTC");
          return (
            <li
              key={s.id}
              className="flex flex-col gap-0.5 py-2.5 sm:grid sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-x-4 sm:py-2.5"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] sm:text-[11px]">
                {s.label}
              </span>
              <span className="min-w-0 text-sm text-[var(--ink)]" suppressHydrationWarning>
                <span className="font-medium">{local.day}</span>
                <span className="text-[var(--muted)]"> · </span>
                <span className="font-mono">{local.time}</span>
              </span>
              <span className="font-mono text-[11px] text-[var(--muted)] sm:text-xs">
                {utc.time} UTC
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
