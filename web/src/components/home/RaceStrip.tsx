import Link from "next/link";
import { TrackOutline } from "@/components/race/TrackOutline";
import type { Race } from "@/lib/data/types";

function formatWindow(date: string) {
  // Show race date; full weekend range needs FP1 data we don't always have.
  try {
    const d = new Date(`${date}T12:00:00Z`);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return date;
  }
}

type StripItem = {
  race: Race;
  lane: "Previous" | "Current" | "Upcoming";
  live?: boolean;
};

export function buildRaceStrip(
  races: Race[],
  featuredRound?: string,
): StripItem[] {
  if (!races.length) return [];
  const today = new Date().toISOString().slice(0, 10);
  let currentIdx = races.findIndex((r) => r.date >= today);
  if (currentIdx < 0) currentIdx = races.length - 1;
  if (featuredRound) {
    const hit = races.findIndex((r) => r.round === featuredRound);
    if (hit >= 0) currentIdx = hit;
  }

  const items: StripItem[] = [];
  if (currentIdx > 0) {
    items.push({ race: races[currentIdx - 1]!, lane: "Previous" });
  }
  items.push({
    race: races[currentIdx]!,
    lane: "Current",
    live: races[currentIdx]!.date === today,
  });
  for (let i = currentIdx + 1; i < races.length && items.length < 4; i++) {
    items.push({ race: races[i]!, lane: "Upcoming" });
  }
  // Backfill previous if short season end
  let back = currentIdx - 2;
  while (items.length < 3 && back >= 0) {
    items.unshift({ race: races[back]!, lane: "Previous" });
    back--;
  }
  return items.slice(0, 4);
}

export function RaceStrip({
  races,
  featuredRound,
}: {
  races: Race[];
  featuredRound?: string;
}) {
  const items = buildRaceStrip(races, featuredRound);
  if (!items.length) return null;

  return (
    <section className="border-t border-[var(--line)] bg-[var(--bg-soft)]">
      <div className="page-wrap space-y-6 py-12 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Season map</p>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Race weekends
            </h2>
          </div>
          <Link href="/calendar" className="btn-ghost">
            Full calendar
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ race, lane, live }, i) => {
            const short = race.raceName.replace(" Grand Prix", "");
            return (
              <Link
                key={`${race.season}-${race.round}`}
                href={`/races/${race.season}/${race.round}`}
                className="stage-card group relative flex min-h-[14rem] flex-col overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <TrackOutline
                  circuitId={race.Circuit.circuitId}
                  size="thumb"
                  className="absolute inset-0 !aspect-auto h-full w-full border-0 bg-transparent"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[color-mix(in_srgb,var(--bg)_35%,transparent)] to-transparent" />

                <div className="relative z-[1] mt-auto space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      {lane} · R{race.round.padStart(2, "0")}
                    </span>
                    {live || lane === "Current" ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--live)]">
                        {live ? "● Live" : "Current"}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-display text-2xl leading-none text-[var(--ink)]">
                    {short}
                  </p>
                  <p className="font-mono text-xs text-[var(--muted)]">
                    {formatWindow(race.date)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
