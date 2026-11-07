import Link from "next/link";
import { HeroLeaders } from "@/components/home/HeroLeaders";
import { HeroNews } from "@/components/home/HeroNews";
import { HeroPack } from "@/components/home/HeroPack";
import { HeroRankings } from "@/components/home/HeroRankings";
import { RaceStrip } from "@/components/home/RaceStrip";
import { RaceWeekendTimes } from "@/components/home/RaceWeekendTimes";
import { TeamStageCard } from "@/components/standings/TeamStageCard";
import { getF1Headlines, type F1Headline } from "@/lib/data/f1-news";
import {
  getConstructorStandings,
  getDriverStandingsDetailed,
  getLastRace,
  getSeasonCalendar,
  pickFeaturedRace,
} from "@/lib/data/jolpica";
import {
  cloudinaryTeamLogo,
  fullDriverImage,
  mediaFromStanding,
} from "@/lib/media";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/data/openf1";
import { raceSessionSlots } from "@/lib/data/race-sessions";
import { teamColor } from "@/lib/media/team-colors";
import type { ConstructorStanding, Race } from "@/lib/data/types";

export const revalidate = 120;

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
  let leadDriver: {
    id: string;
    name: string;
    points: string;
    color: string;
    shot: string | null;
  } | null = null;
  let leadConstructor: {
    id: string;
    name: string;
    points: string;
    color: string;
    logo: string | null;
  } | null = null;
  let allDriverStandings: Awaited<
    ReturnType<typeof getDriverStandingsDetailed>
  >["standings"] = [];
  let media: Awaited<ReturnType<typeof getDriverMediaIndex>> | null = null;
  let headlines: F1Headline[] = [];

  try {
    const [racesRes, detailed, lastRace, mediaRes, ctorRes, newsRes] =
      await Promise.all([
        getSeasonCalendar("current"),
        getDriverStandingsDetailed("current"),
        getLastRace("current"),
        getDriverMediaIndex().catch(() => null),
        getConstructorStandings("current").catch(() => []),
        getF1Headlines(14).catch(() => [] as F1Headline[]),
      ]);
    headlines = newsRes;

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

    const d1 = topDrivers[0];
    if (d1) {
      leadDriver = {
        id: d1.id,
        name: d1.name,
        points: d1.points,
        color: d1.color,
        shot: d1.shot,
      };
    }

    const c1 = ctorRes[0];
    if (c1) {
      leadConstructor = {
        id: c1.Constructor.constructorId,
        name: c1.Constructor.name,
        points: c1.points,
        color: teamColor(c1.Constructor.constructorId),
        logo: cloudinaryTeamLogo({
          constructorId: c1.Constructor.constructorId,
          teamName: c1.Constructor.name,
          width: 96,
          variant: "white",
        }),
      };
    }
  } catch {
    featured = null;
  }

  const raceName = featured?.race.raceName ?? "Championship";
  const raceMeta = featured
    ? `${featured.race.Circuit.Location.locality} · ${featured.race.date}`
    : standingsSeason
      ? `${standingsSeason} season`
      : "";
  const sessions =
    featured?.status === "upcoming" ? raceSessionSlots(featured.race) : [];

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

        <div className="relative z-10 flex h-[calc(100svh-4rem)] max-h-[calc(100svh-4rem)] overflow-hidden">
          <div className="flex min-h-0 w-full min-w-0 flex-col justify-between gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:w-[min(34rem,38%)] lg:shrink-0 lg:px-8 lg:py-12 xl:w-[min(36rem,36%)] xl:pl-12">
            <div className="flex min-w-0 flex-col space-y-4">
              <p className="font-display animate-hero-rise text-[clamp(3.25rem,9vw,5.75rem)] leading-[0.85] text-[var(--ink)]">
                F1_v1
              </p>
              <div className="animate-hero-rise-delay space-y-2">
                <p className="eyebrow !text-[var(--brand)]">
                  {featured?.status === "upcoming" ? "Next up" : "Latest"}
                </p>
                <h1 className="font-display text-3xl leading-none tracking-tight text-[var(--ink)] sm:text-4xl">
                  {raceName}
                </h1>
                <p className="max-w-lg text-sm leading-relaxed text-[var(--muted)]">
                  {raceMeta}
                  {lastRaceLabel ? ` · ${lastRaceLabel}` : ""}
                </p>
              </div>
            </div>

            {sessions.length ? (
              <RaceWeekendTimes sessions={sessions} />
            ) : (
              <div className="flex-1" aria-hidden />
            )}

            <HeroLeaders
              driver={leadDriver}
              constructor={leadConstructor}
              round={standingsRound}
              season={standingsSeason}
            />
          </div>

          <HeroNews items={headlines} />
          <HeroPack />
        </div>
      </section>

      {topDrivers.length ? (
        <section className="border-t border-[var(--line)]">
          <div className="page-wrap py-12 sm:py-14">
            <HeroRankings
              drivers={topDrivers}
              round={standingsRound}
              season={standingsSeason}
            />
          </div>
        </section>
      ) : null}

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
