"use client";

import { useMemo, useState } from "react";
import { PracticeResultsTable } from "@/components/race/PracticeResultsTable";
import { QualifyingTable, RaceResultsTable } from "@/components/race/ResultsTable";
import type { DriverMediaIndex } from "@/lib/data/openf1";
import type { PracticeBoard } from "@/lib/data/openf1-live";
import { raceSessionSlots } from "@/lib/data/race-sessions";
import type { Race } from "@/lib/data/types";

type TabId =
  | "fp1"
  | "fp2"
  | "fp3"
  | "race"
  | "qualifying"
  | "sprint"
  | "schedule";

export function RaceWeekendTabs({
  schedule,
  race,
  quali,
  sprint,
  practices,
  media,
}: {
  schedule: Race | null;
  race: Race | null;
  quali: Race | null;
  sprint: Race | null;
  practices: PracticeBoard[];
  media?: DriverMediaIndex | null;
}) {
  const raceRows = race?.Results ?? [];
  const qualiRows = quali?.QualifyingResults ?? [];
  const sprintRows = sprint?.SprintResults ?? [];
  const sessions = schedule ? raceSessionSlots(schedule) : [];
  const hasSprintSession = Boolean(
    schedule?.Sprint || schedule?.SprintQualifying || schedule?.SprintShootout,
  );
  const practiceById = useMemo(() => {
    const map = new Map<string, PracticeBoard>();
    for (const p of practices) map.set(p.id, p);
    return map;
  }, [practices]);

  const tabs = useMemo(() => {
    const list: Array<{ id: TabId; label: string; available: boolean }> = [
      {
        id: "fp1",
        label: "FP1",
        available: Boolean(schedule?.FirstPractice || practiceById.get("fp1")),
      },
      {
        id: "fp2",
        label: "FP2",
        available: Boolean(schedule?.SecondPractice || practiceById.get("fp2")),
      },
      {
        id: "fp3",
        label: "FP3",
        available: Boolean(schedule?.ThirdPractice || practiceById.get("fp3")),
      },
      {
        id: "qualifying",
        label: "Qualifying",
        available: qualiRows.length > 0 || Boolean(schedule?.Qualifying),
      },
      {
        id: "sprint",
        label: "Sprint",
        available: sprintRows.length > 0 || hasSprintSession,
      },
      {
        id: "race",
        label: "Race",
        available: raceRows.length > 0 || Boolean(schedule),
      },
      {
        id: "schedule",
        label: "Schedule",
        available: sessions.length > 0,
      },
    ];
    return list.filter((t) => t.available);
  }, [
    schedule,
    practiceById,
    qualiRows.length,
    sprintRows.length,
    hasSprintSession,
    raceRows.length,
    sessions.length,
  ]);

  const defaultTab: TabId =
    (tabs.find((t) => t.id === "race" && raceRows.length)?.id as
      | TabId
      | undefined) ??
    (tabs.find((t) => t.id === "qualifying" && qualiRows.length)?.id as
      | TabId
      | undefined) ??
    tabs[0]?.id ??
    "race";

  const [tab, setTab] = useState<TabId>(defaultTab);
  const active = tabs.some((t) => t.id === tab) ? tab : defaultTab;

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Weekend sessions"
        className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-3"
      >
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
                on
                  ? "bg-[var(--brand)] text-white"
                  : "border border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-4">
        {active === "fp1" || active === "fp2" || active === "fp3" ? (
          <>
            <h2 className="eyebrow">
              {practiceById.get(active)?.session_name ?? active.toUpperCase()}
            </h2>
            <PracticeResultsTable
              rows={practiceById.get(active)?.rows ?? []}
            />
          </>
        ) : null}

        {active === "race" ? (
          <>
            <h2 className="eyebrow">Race</h2>
            <RaceResultsTable rows={raceRows} media={media} />
          </>
        ) : null}

        {active === "qualifying" ? (
          <>
            <h2 className="eyebrow">Qualifying</h2>
            <QualifyingTable rows={qualiRows} media={media} />
          </>
        ) : null}

        {active === "sprint" ? (
          <>
            <h2 className="eyebrow">Sprint</h2>
            {sprintRows.length ? (
              <RaceResultsTable rows={sprintRows} media={media} />
            ) : (
              <p className="text-[var(--muted)]">
                Sprint results are not available yet for this weekend.
              </p>
            )}
          </>
        ) : null}

        {active === "schedule" ? (
          <>
            <h2 className="eyebrow">Weekend schedule</h2>
            {sessions.length ? (
              <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {sessions.map((s) => {
                  const d = new Date(s.at);
                  const when = Number.isNaN(d.getTime())
                    ? s.at
                    : d.toLocaleString("en-GB", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: false,
                        timeZoneName: "short",
                      });
                  return (
                    <li
                      key={s.id}
                      className="grid grid-cols-[7rem_1fr] items-baseline gap-4 py-3 sm:grid-cols-[8rem_1fr_auto]"
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {s.label}
                      </span>
                      <span className="text-sm text-[var(--ink)]">{when}</span>
                      <span className="col-span-2 font-mono text-xs text-[var(--muted)] sm:col-span-1 sm:text-right">
                        {Number.isNaN(d.getTime())
                          ? ""
                          : d.toISOString().slice(11, 16) + " UTC"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[var(--muted)]">Schedule not published yet.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
