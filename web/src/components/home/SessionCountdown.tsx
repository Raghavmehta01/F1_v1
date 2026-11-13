"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function partsUntil(targetMs: number, now: number) {
  const diff = Math.max(0, targetMs - now);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return { diff, days, hours, mins, secs };
}

function formatClock(ms: number, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(ms));
}

function localZoneLabel() {
  try {
    const raw = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!raw) return "Local";
    const city = raw.split("/").pop()?.replace(/_/g, " ");
    return city || "Local";
  } catch {
    return "Local";
  }
}

function TwinClocks({ now }: { now: number }) {
  const [tz, setTz] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    let id = "UTC";
    try {
      id = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      id = "UTC";
    }
    setTz({ id, label: localZoneLabel() });
  }, []);

  const local = tz ? formatClock(now, tz.id) : "--:--:--";
  const utc = tz ? formatClock(now, "UTC") : "--:--:--";

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-3 sm:gap-3">
      <div className="min-w-0">
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Local{tz ? ` · ${tz.label}` : ""}
        </p>
        <p
          className="mt-1 font-mono text-sm tracking-tight text-[var(--ink)] sm:text-base"
          suppressHydrationWarning
        >
          {local}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
          International · UTC
        </p>
        <p
          className="mt-1 font-mono text-sm tracking-tight text-[var(--ink)] sm:text-base"
          suppressHydrationWarning
        >
          {utc}
        </p>
      </div>
    </div>
  );
}

export function SessionCountdown({
  targetIso,
  label,
  className = "",
}: {
  /** ISO UTC instant */
  targetIso: string;
  label: string;
  className?: string;
}) {
  const targetMs = Date.parse(targetIso);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(targetMs)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [targetMs]);

  if (!Number.isFinite(targetMs)) return null;

  const { diff, days, hours, mins, secs } = partsUntil(targetMs, now);
  if (diff <= 0) {
    return (
      <div
        className={`border border-[var(--live)]/50 bg-[var(--bg-elevated)] px-4 py-3 sm:px-5 sm:py-4 ${className}`}
      >
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--live)]">
          {label}
        </p>
        <p className="mt-1 font-display text-xl tracking-tight text-[var(--ink)]">
          Session window open
        </p>
        <TwinClocks now={now} />
      </div>
    );
  }

  return (
    <div
      className={`border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-5 sm:py-4 ${className}`}
      aria-live="polite"
    >
      <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Countdown · {label}
      </p>
      <p className="mt-2 font-mono text-xl tracking-tight text-[var(--ink)] sm:text-3xl">
        {days > 0 ? (
          <>
            <span className="text-[var(--brand)]">{days}</span>
            <span className="text-[var(--muted)]">d </span>
          </>
        ) : null}
        <span className="text-[var(--brand)]">{pad(hours)}</span>
        <span className="text-[var(--muted)]">:</span>
        <span className="text-[var(--brand)]">{pad(mins)}</span>
        <span className="text-[var(--muted)]">:</span>
        <span className="text-[var(--brand)]">{pad(secs)}</span>
      </p>
      <TwinClocks now={now} />
    </div>
  );
}
