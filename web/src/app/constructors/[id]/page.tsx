import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { StatWall } from "@/components/StatWall";
import {
  getConstructor,
  getConstructorStandings,
  getDriverStandingsDetailed,
} from "@/lib/jolpica";
import {
  cloudinaryTeamCar,
  cloudinaryTeamLogo,
  fullDriverImage,
  mediaFromStanding,
} from "@/lib/media";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/openf1";
import { teamStageFill, teamStageInk } from "@/lib/team-colors";
import { parseId } from "@/lib/validation";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export default async function ConstructorPage({ params }: Props) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const [team, constructors, drivers, media] = await Promise.all([
    getConstructor(id),
    getConstructorStandings("current").catch(() => []),
    getDriverStandingsDetailed("current").catch(() => ({
      season: "",
      round: "—",
      standings: [],
    })),
    getDriverMediaIndex().catch(() => null),
  ]);
  if (!team) notFound();

  const fill = teamStageFill(id);
  const ink = teamStageInk(id);
  const car = cloudinaryTeamCar({ constructorId: id, width: 1400 });
  const logo = cloudinaryTeamLogo({ constructorId: id, width: 200 });
  const standing = constructors.find((c) => c.Constructor.constructorId === id);
  const lineup = drivers.standings.filter(
    (d) => d.Constructors?.[0]?.constructorId === id,
  );

  const seasonStats = [
    { label: "Season position", value: standing ? `P${standing.position}` : "—" },
    { label: "Season points", value: standing?.points ?? "—" },
    { label: "Grand Prix wins", value: standing?.wins ?? "—" },
    {
      label: "Drivers scoring",
      value: String(lineup.length || "—"),
    },
  ];

  return (
    <div>
      <section
        className="team-halftone relative isolate overflow-hidden text-white"
        style={{ backgroundColor: fill, color: ink }}
      >
        <span
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.35) 100%)",
          }}
          aria-hidden
        />
        <div className="page-wrap relative z-[2] flex min-h-[min(72svh,36rem)] flex-col justify-end gap-8 py-14 sm:py-16">
          <Link
            href="/standings?tab=constructors"
            className="absolute left-4 top-6 font-mono text-[11px] uppercase tracking-[0.18em] text-white/85 hover:text-white sm:left-6"
          >
            ← All teams
          </Link>

          {logo ? (
            <span className="pointer-events-none absolute right-4 top-6 h-16 w-16 sm:right-8 sm:h-24 sm:w-24">
              <span className="relative block h-full w-full">
                <SafeImage
                  src={logo}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)]"
                  fallback={null}
                />
              </span>
            </span>
          ) : null}

          {car ? (
            <div className="animate-car-slide relative mx-auto h-36 w-full max-w-3xl sm:h-48">
              <SafeImage
                src={car}
                alt={`${team.name} car`}
                fill
                priority
                sizes="800px"
                className="car-drive object-contain object-center"
                fallback={null}
              />
            </div>
          ) : null}

          <div className="space-y-4 text-center">
            <h1 className="font-display text-5xl tracking-tight sm:text-7xl">
              {String(team.name).toUpperCase()}
            </h1>
            <p className="text-base opacity-85 sm:text-lg">
              {lineup.length
                ? lineup
                    .map((d) => `${d.Driver.givenName} ${d.Driver.familyName}`)
                    .join("  ·  ")
                : (team.nationality ?? "")}
            </p>
            {standing ? (
              <p className="font-mono text-xs tracking-[0.2em] opacity-70">
                P{standing.position.padStart(2, "0")} · {standing.points} PTS ·{" "}
                {standing.wins} WINS
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="page-wrap space-y-12 py-14 sm:py-16">
        <div>
          <p className="eyebrow mb-4">Drivers</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {lineup.map((d) => {
              const of1 = media
                ? matchOpenF1Driver(media, {
                    code: d.Driver.code,
                    familyName: d.Driver.familyName,
                    number: d.Driver.permanentNumber,
                  })
                : null;
              const shot = fullDriverImage(
                mediaFromStanding({
                  of1,
                  code: d.Driver.code,
                  driverId: d.Driver.driverId,
                  constructorId: d.Constructors?.[0]?.constructorId ?? id,
                  constructorName: d.Constructors?.[0]?.name,
                }),
              );
              const number =
                d.Driver.permanentNumber ??
                (of1?.driver_number != null ? String(of1.driver_number) : "—");
              return (
                <Link
                  key={d.Driver.driverId}
                  href={`/drivers/${d.Driver.driverId}`}
                  className="stage-card team-halftone group relative flex min-h-[12rem] overflow-hidden text-white"
                  style={{ backgroundColor: fill }}
                >
                  <span
                    className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/45 to-black/10"
                    aria-hidden
                  />
                  <div className="relative z-[2] flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="font-display text-2xl leading-none text-white">
                        {d.Driver.givenName}
                        <br />
                        {d.Driver.familyName}
                      </h3>
                      <p className="mt-2 text-sm text-white/80">
                        {String(team.name)}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-white/70">
                      P{d.position} · {d.points} pts
                    </p>
                  </div>
                  <span
                    className="pointer-events-none absolute bottom-0 left-3 z-[1] font-display text-[6rem] leading-none text-white/20"
                    aria-hidden
                  >
                    {number}
                  </span>
                  <div className="relative z-[2] w-[44%] self-stretch">
                    {shot ? (
                      <SafeImage
                        src={shot}
                        alt=""
                        fill
                        sizes="240px"
                        className="portrait-hover object-cover object-[68%_top]"
                        fallback={null}
                      />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <StatWall
          title={`${drivers.season || "2026"} season`}
          stats={seasonStats}
        />

        <Link href="/standings" className="btn-ghost inline-flex">
          View standings
        </Link>
      </section>
    </div>
  );
}
