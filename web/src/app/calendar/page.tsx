import Link from "next/link";
import { CircuitMini } from "@/components/race/CircuitMini";
import { CalendarPodium } from "@/components/race/CalendarPodium";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeasonSwitcher } from "@/components/ui/SeasonSwitcher";
import {
  getActiveSeasonYear,
  getSeasonCalendar,
  getSeasonRaceResults,
  getSeasons,
  podiumByRound,
} from "@/lib/data/jolpica";
import { fullDriverImage, mediaFromStanding } from "@/lib/media";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/data/openf1";
import { parseSeason } from "@/lib/security/validation";

export const revalidate = 120;

type Props = { searchParams: Promise<{ season?: string }> };

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeYear = await getActiveSeasonYear();
  const requested = parseSeason(params.season);
  const useCurrent = requested == null || requested === activeYear;
  const season = requested ?? activeYear;
  const seasonKey = useCurrent ? ("current" as const) : season;

  const [races, seasons, results, media] = await Promise.all([
    getSeasonCalendar(seasonKey),
    getSeasons().catch(() => [] as string[]),
    getSeasonRaceResults(seasonKey).catch(() => []),
    getDriverMediaIndex().catch(() => null),
  ]);

  const podiums = podiumByRound(results);
  const todayUtc = new Date().toISOString().slice(0, 10);
  const yearLinks = (seasons.length ? seasons : [String(season)]).slice(0, 10);

  const shots: Record<string, string | null> = {};
  for (const slots of podiums.values()) {
    for (const slot of slots) {
      if (shots[slot.driverId] !== undefined) continue;
      const of1 = media
        ? matchOpenF1Driver(media, {
            code: slot.code,
            familyName: slot.name.split(" ").slice(-1)[0],
          })
        : null;
      shots[slot.driverId] = fullDriverImage(
        mediaFromStanding({
          of1,
          code: slot.code,
          driverId: slot.driverId,
          constructorId: slot.constructorId,
          constructorName: slot.constructorName,
        }),
      );
    }
  }

  return (
    <div className="page-wrap space-y-12 py-12 sm:py-16">
      <PageHeader
        eyebrow="Season map"
        title="Calendar"
        description={`Every ${season} race weekend on the championship calendar.`}
      >
        <div className="pt-2">
          <SeasonSwitcher
            seasons={yearLinks}
            current={String(season)}
            makeHref={(s) => `/calendar?season=${s}`}
          />
        </div>
      </PageHeader>

      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {races.map((race, i) => {
          const upcoming = race.date >= todayUtc;
          const podium = !upcoming ? podiums.get(race.round) : undefined;
          return (
            <li
              key={`${race.season}-${race.round}`}
              className="animate-row-in"
              style={{ animationDelay: `${Math.min(i, 14) * 28}ms` }}
            >
              <Link
                href={`/races/${race.season}/${race.round}`}
                className="group grid gap-4 py-5 transition-colors hover:bg-[var(--bg-elevated)] lg:grid-cols-[6.5rem_minmax(11rem,0.9fr)_minmax(16rem,1.35fr)_auto] lg:items-center lg:gap-6 lg:px-2 lg:py-6"
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

                {podium?.length ? (
                  <CalendarPodium podium={podium} shots={shots} />
                ) : (
                  <div className="hidden lg:block" aria-hidden />
                )}

                <time className="font-mono text-sm text-[var(--ink)] lg:text-right">
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
