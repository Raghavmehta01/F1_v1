import Link from "next/link";
import { CircuitMini } from "@/components/race/CircuitMini";
import { PageHeader } from "@/components/layout/PageHeader";
import { getActiveSeasonYear, getSeasonCalendar } from "@/lib/data/jolpica";
import { parseSeason } from "@/lib/security/validation";

export const revalidate = 120;

type Props = { searchParams: Promise<{ season?: string }> };

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeYear = await getActiveSeasonYear();
  const requested = parseSeason(params.season);
  const useCurrent = requested == null || requested === activeYear;
  const season = requested ?? activeYear;
  const races = await getSeasonCalendar(useCurrent ? "current" : season);
  const todayUtc = new Date().toISOString().slice(0, 10);

  return (
    <div className="page-wrap space-y-12 py-12 sm:py-16">
      <PageHeader
        eyebrow="Season map"
        title="Calendar"
        description={`Every ${season} race weekend on the championship calendar.`}
      />

      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {races.map((race, i) => {
          const upcoming = race.date >= todayUtc;
          return (
            <li
              key={`${race.season}-${race.round}`}
              className="animate-row-in"
              style={{ animationDelay: `${Math.min(i, 14) * 28}ms` }}
            >
              <Link
                href={`/races/${race.season}/${race.round}`}
                className="group grid gap-4 py-6 transition-colors hover:bg-[var(--bg-elevated)] sm:grid-cols-[7rem_1fr_auto] sm:items-center sm:gap-8 sm:px-2"
              >
                <CircuitMini
                  circuitId={race.Circuit.circuitId}
                  alt={race.Circuit.circuitName}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[var(--muted)]">
                      R{race.round.padStart(2, "0")}
                    </span>
                    {upcoming ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--live)]">
                        Upcoming
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="font-display text-2xl tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--brand)] sm:text-3xl">
                    {race.raceName.replace(" Grand Prix", "")}
                    <span className="text-[var(--muted)]"> GP</span>
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {race.Circuit.Location.locality},{" "}
                    {race.Circuit.Location.country}
                  </p>
                </div>
                <time className="font-mono text-sm text-[var(--ink)] sm:text-right">
                  {race.date}
                </time>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
