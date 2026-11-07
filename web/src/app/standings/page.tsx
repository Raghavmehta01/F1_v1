import Link from "next/link";
import { Suspense } from "react";
import { CarLoader } from "@/components/ui/CarLoader";
import { DriverStageGrid } from "@/components/standings/DriverStageCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandingsTabs } from "@/components/standings/StandingsTabs";
import { TeamStageGrid } from "@/components/standings/TeamStageCard";
import {
  getActiveSeasonYear,
  getConstructorStandings,
  getDriverStandingsDetailed,
  getLastRace,
  getSeasons,
} from "@/lib/data/jolpica";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/data/openf1";
import { parseSeason } from "@/lib/security/validation";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{ season?: string; tab?: string }>;
};

export default async function StandingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = params.tab === "constructors" ? "constructors" : "drivers";
  const requested = parseSeason(params.season);
  const activeYear = await getActiveSeasonYear();
  const useCurrent = requested == null || requested === activeYear;
  const seasonKey = useCurrent ? ("current" as const) : requested;

  const [detailed, constructors, seasons, media, lastRace] = await Promise.all([
    getDriverStandingsDetailed(seasonKey),
    getConstructorStandings(seasonKey),
    getSeasons().catch(() => [] as string[]),
    getDriverMediaIndex().catch(() => null),
    getLastRace(seasonKey).catch(() => null),
  ]);

  const seasonLabel = detailed.season || String(requested ?? activeYear);
  const yearLinks = (seasons.length ? seasons : [seasonLabel]).slice(0, 10);
  const winner = lastRace?.Results?.[0]?.Driver;

  const seasonQuery = (s: string) => {
    const q = new URLSearchParams({ season: s });
    if (tab !== "drivers") q.set("tab", tab);
    return `/standings?${q.toString()}`;
  };

  return (
    <div className="page-wrap space-y-10 py-12 sm:py-16">
      <PageHeader
        eyebrow={`Round ${detailed.round} · ${seasonLabel}`}
        title="Standings"
        description={
          lastRace
            ? `After ${lastRace.raceName}${
                winner
                  ? ` · Winner ${winner.givenName} ${winner.familyName}`
                  : ""
              }.`
            : `Driver and constructor order for ${seasonLabel}.`
        }
      >
        <div className="flex flex-wrap gap-2 pt-2">
          {yearLinks.map((s) => (
            <Link
              key={s}
              href={seasonQuery(s)}
              className={`border px-3 py-1.5 font-mono text-xs tracking-wide transition-colors ${
                seasonLabel === s
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {s}
            </Link>
          ))}
          <Link
            href="/history"
            className="border border-[var(--line)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            Archive
          </Link>
        </div>
      </PageHeader>

      <Suspense fallback={<CarLoader size="inline" label="Standings" />}>
        <StandingsTabs season={seasonLabel} />
      </Suspense>

      {tab === "drivers" ? (
        <section className="space-y-5">
          <h2 className="eyebrow">Driver championship</h2>
          <DriverStageGrid
            rows={detailed.standings}
            resolve={(row) =>
              media
                ? matchOpenF1Driver(media, {
                    code: row.Driver.code,
                    familyName: row.Driver.familyName,
                    number: row.Driver.permanentNumber,
                  })
                : null
            }
          />
        </section>
      ) : (
        <section className="space-y-5">
          <h2 className="eyebrow">Constructor championship</h2>
          <TeamStageGrid
            rows={constructors}
            driverStandings={detailed.standings}
            media={media}
          />
        </section>
      )}
    </div>
  );
}
