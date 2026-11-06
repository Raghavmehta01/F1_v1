import Link from "next/link";
import { HeroPack } from "@/components/HeroPack";
import { HeroRankings } from "@/components/HeroRankings";
import { RaceStrip } from "@/components/RaceStrip";
import { TeamStageCard } from "@/components/TeamStageCard";
import {
  getConstructorStandings,
  getDriverStandingsDetailed,
  getLastRace,
  getSeasonCalendar,
  pickFeaturedRace,
} from "@/lib/jolpica";
import { fullDriverImage, mediaFromStanding } from "@/lib/media";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/openf1";
import { teamColor } from "@/lib/team-colors";
import type { ConstructorStanding, Race } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  let featured: ReturnType<typeof pickFeaturedRace> = null;
  let standingsRound = "—";
  let standingsSeason = "";
  let lastRaceLabel = "";
  let races: Race[] = [];
  let constructors: ConstructorStanding[] = [];
  let topDrivers: Array<{
    id: string;
    name: string;
    points: string;
    pos: string;
    color: string;
    shot: string | null;
  }> = [];
  let allDriverStandings: Awaited<
    ReturnType<typeof getDriverStandingsDetailed>
  >["standings"] = [];
  let media: Awaited<ReturnType<typeof getDriverMediaIndex>> | null = null;

  try {
    const [racesRes, detailed, lastRace, mediaRes, ctorRes] = await Promise.all(
      [
        getSeasonCalendar("current"),
        getDriverStandingsDetailed("current"),
        getLastRace("current"),
        getDriverMediaIndex().catch(() => null),
        getConstructorStandings("current").catch(() => []),
      ],
    );

    races = racesRes;
    constructors = ctorRes.slice(0, 4);
    media = mediaRes;
    featured = pickFeaturedRace(races);
    standingsRound = detailed.round;
    standingsSeason = detailed.season;
    allDriverStandings = detailed.standings;

    if (lastRace) {
      const winner = lastRace.Results?.[0]?.Driver;
      lastRaceLabel = winner
        ? `${lastRace.raceName} · ${winner.familyName} won`
        : lastRace.raceName;
    }

    topDrivers = detailed.standings.slice(0, 5).map((row) => {
      const team = row.Constructors?.[0];
      const of1 = media
        ? matchOpenF1Driver(media, {
            code: row.Driver.code,
            familyName: row.Driver.familyName,
            number: row.Driver.permanentNumber,
          })
        : null;
      return {
        id: row.Driver.driverId,
        name: `${row.Driver.givenName} ${row.Driver.familyName}`,
        points: row.points,
        pos: row.position,
        color: teamColor(team?.constructorId),
        shot: fullDriverImage(
          mediaFromStanding({
            of1,
            code: row.Driver.code,
            driverId: row.Driver.driverId,
            constructorId: team?.constructorId,
            constructorName: team?.name,
          }),
        ),
      };
    });
  } catch {
    featured = null;
  }

  const raceName = featured?.race.raceName ?? "Championship";
  const raceMeta = featured
    ? `${featured.race.Circuit.Location.locality} · ${featured.race.date}`
    : standingsSeason
      ? `${standingsSeason} season`
      : "";
  const raceHref = featured
    ? `/races/${featured.race.season}/${featured.race.round}`
    : "/calendar";

  const byTeam = new Map<string, typeof allDriverStandings>();
  for (const d of allDriverStandings) {
    const cid = d.Constructors?.[0]?.constructorId;
    if (!cid) continue;
    const list = byTeam.get(cid) ?? [];
    list.push(d);
    byTeam.set(cid, list);
  }

  return (
    <>
      <section className="relative isolate overflow-hidden bg-[var(--bg)]">
        <div
          className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_15%_0%,var(--hero-glow)_0%,var(--bg)_58%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 -z-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-12deg, transparent, transparent 40px, var(--hero-stripe) 40px, var(--hero-stripe) 41px)",
          }}
          aria-hidden
        />

        <div className="page-wrap relative z-10 grid min-h-[calc(100svh-4rem)] grid-cols-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)_auto] lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-7">
            <p className="font-display animate-hero-rise text-[clamp(3.5rem,10vw,6.5rem)] leading-[0.85] text-[var(--ink)]">
              F1_v1
            </p>
            <div className="animate-hero-rise-delay space-y-3">
              <p className="eyebrow !text-[var(--brand)]">
                {featured?.status === "upcoming" ? "Next up" : "Latest"}
              </p>
              <h1 className="font-display text-3xl leading-none tracking-tight text-[var(--ink)] sm:text-4xl xl:text-5xl">
                {raceName}
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                {raceMeta}. After round {standingsRound}
                {lastRaceLabel ? ` · ${lastRaceLabel}` : ""}.
              </p>
            </div>
            <div className="animate-hero-rise-delay flex flex-wrap gap-3">
              <Link href="/standings" className="btn-primary">
                Standings
              </Link>
              <Link href={raceHref} className="btn-ghost">
                {featured?.status === "upcoming" ? "Race weekend" : "Results"}
              </Link>
              <Link href="/live" className="btn-ghost">
                Timing
              </Link>
            </div>
          </div>

          <HeroRankings
            drivers={topDrivers}
            round={standingsRound}
            season={standingsSeason}
          />

          <HeroPack />
        </div>
      </section>

      <RaceStrip races={races} featuredRound={featured?.race.round} />

      {constructors.length ? (
        <section className="border-t border-[var(--line)]">
          <div className="page-wrap space-y-6 py-12 sm:py-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Constructors</p>
                <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
                  Team stages
                </h2>
              </div>
              <Link href="/standings" className="btn-ghost">
                Full grid
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {constructors.map((row, i) => (
                <TeamStageCard
                  key={row.Constructor.constructorId}
                  row={row}
                  drivers={byTeam.get(row.Constructor.constructorId) ?? []}
                  media={media}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
