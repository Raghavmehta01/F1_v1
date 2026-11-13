import Link from "next/link";
import { HeroLeaders } from "@/components/home/HeroLeaders";
import { HeroNews } from "@/components/home/HeroNews";
import { HeroRankings } from "@/components/home/HeroRankings";
import { NextRaceBoard } from "@/components/home/NextRaceBoard";
import { RaceStrip } from "@/components/home/RaceStrip";
import { RaceWeekendTimes } from "@/components/home/RaceWeekendTimes";
import { SessionCountdown } from "@/components/home/SessionCountdown";
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
import { findNextSession } from "@/lib/data/next-session";
import { raceSessionSlots } from "@/lib/data/race-sessions";
import { teamColor } from "@/lib/media/team-colors";
import type { ConstructorStanding, Race } from "@/lib/data/types";
import { HeroPack } from "@/components/home/HeroPack";

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
    team: string;
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
        team: team?.name ?? "",
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
  const nextSession = findNextSession(races);

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

        {/* Two-column hero: copy packed top-left, circuit fills right — no empty voids */}
        <div className="relative z-10 grid md:grid-cols-2 md:items-stretch">
          <div className="flex flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8 lg:px-10 lg:py-8">
            <div className="space-y-2">
              <p className="font-display animate-hero-rise whitespace-nowrap text-[clamp(2.1rem,5.5vw,4.25rem)] leading-[0.88] text-[var(--ink)]">
                Formula 1
              </p>
              <div className="animate-hero-rise-delay space-y-1">
                <p className="eyebrow !text-[var(--brand)]">
                  {featured?.status === "upcoming" ? "Next up" : "Latest"}
                </p>
                <h1 className="font-display text-2xl leading-none tracking-tight text-[var(--ink)] sm:text-3xl">
                  {raceName}
                </h1>
                <p className="max-w-md text-sm leading-snug text-[var(--muted)]">
                  {raceMeta}
                  {lastRaceLabel ? ` · ${lastRaceLabel}` : ""}
                </p>
              </div>
            </div>

            {nextSession ? (
              <SessionCountdown
                targetIso={nextSession.slot.at}
                label={`${nextSession.slot.label} · ${nextSession.race.raceName}`}
              />
            ) : null}
            {sessions.length ? (
              <RaceWeekendTimes sessions={sessions} />
            ) : null}
          </div>

          {featured ? (
            <NextRaceBoard
              race={featured.race}
              status={featured.status}
              seasonTotal={races.length}
              className="min-h-[18rem] border-t border-[var(--line)] md:min-h-[28rem] md:border-l md:border-t-0"
            />
          ) : (
            <div className="relative hidden min-h-[28rem] border-l border-[var(--line)] md:block">
              <HeroPack className="!ml-0 h-full w-full" />
            </div>
          )}
        </div>
      </section>

      {/* News + leaders — dense strip under hero (not a tall empty middle column) */}
      <section className="border-t border-[var(--line)]">
        <div className="page-wrap grid gap-8 py-6 sm:py-8 lg:grid-cols-2 lg:gap-10">
          <HeroNews items={headlines} />
          <HeroLeaders
            driver={leadDriver}
            constructor={leadConstructor}
            round={standingsRound}
            season={standingsSeason}
          />
        </div>
      </section>

      {topDrivers.length ? (
        <section className="border-t border-[var(--line)]">
          <div className="page-wrap py-8 sm:py-10">
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
          <div className="page-wrap space-y-5 py-8 sm:py-10">
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
