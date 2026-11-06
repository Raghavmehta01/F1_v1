import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import { StatWall } from "@/components/StatWall";
import { getDriver, getDriverStandingsDetailed } from "@/lib/jolpica";
import { fullDriverImage, mediaFromStanding } from "@/lib/media";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/openf1";
import { teamStageFill, teamStageInk } from "@/lib/team-colors";
import { parseId } from "@/lib/validation";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export default async function DriverPage({ params }: Props) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) notFound();

  const [driver, media, standings] = await Promise.all([
    getDriver(id),
    getDriverMediaIndex().catch(() => null),
    getDriverStandingsDetailed("current").catch(() => null),
  ]);
  if (!driver) notFound();

  const of1 = media
    ? matchOpenF1Driver(media, {
        code: driver.code,
        familyName: driver.familyName,
        number: driver.permanentNumber,
      })
    : null;

  const row = standings?.standings.find((s) => s.Driver.driverId === id);
  const constructorId = row?.Constructors?.[0]?.constructorId;
  const fill = teamStageFill(constructorId);
  const ink = teamStageInk(constructorId);
  const shot = fullDriverImage(
    mediaFromStanding({
      of1,
      code: driver.code,
      driverId: driver.driverId,
      constructorId,
      constructorName: row?.Constructors?.[0]?.name,
    }),
  );
  const number =
    driver.permanentNumber ??
    (of1?.driver_number != null ? String(of1.driver_number) : "—");
  const teamName = row?.Constructors?.[0]?.name ?? of1?.team_name ?? "—";

  const stats = [
    { label: "Championship", value: row ? `P${row.position}` : "—" },
    { label: "Points", value: row?.points ?? "—" },
    { label: "Wins", value: row?.wins ?? "—" },
    { label: "Number", value: `#${number}` },
    { label: "Nationality", value: driver.nationality ?? "—" },
    { label: "Date of birth", value: driver.dateOfBirth ?? "—" },
  ];

  return (
    <div>
      <section
        className="team-halftone relative isolate overflow-hidden text-white"
        style={{ backgroundColor: fill, color: ink }}
      >
        <span
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/50 via-black/20 to-transparent"
          aria-hidden
        />
        <div className="page-wrap relative z-[2] grid min-h-[min(70svh,34rem)] items-end gap-8 py-12 sm:grid-cols-[1fr_minmax(14rem,22rem)] sm:py-16">
          <div className="relative space-y-4 pb-4">
            <p className="eyebrow !text-white/75">
              {driver.code ?? of1?.name_acronym ?? id}
            </p>
            <h1 className="font-display text-5xl leading-[0.9] tracking-tight text-white sm:text-7xl">
              {driver.givenName}
              <br />
              {driver.familyName}
            </h1>
            <p className="text-lg text-white/85">{teamName}</p>
            <span
              className="pointer-events-none absolute -bottom-6 left-0 font-display text-[8rem] leading-none tracking-tighter text-white/20 sm:text-[10rem]"
              aria-hidden
            >
              {number}
            </span>
          </div>

          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm self-end">
            {shot ? (
              <SafeImage
                src={shot}
                alt={`${driver.givenName} ${driver.familyName}`}
                fill
                priority
                sizes="360px"
                className="animate-car-slide object-cover object-[68%_top]"
                fallback={null}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="page-wrap space-y-10 py-14 sm:py-16">
        <StatWall title="Statistics" stats={stats} />
        <div className="flex flex-wrap gap-3">
          {constructorId ? (
            <Link
              href={`/constructors/${constructorId}`}
              className="btn-primary"
            >
              Team page
            </Link>
          ) : null}
          <Link href="/standings" className="btn-ghost">
            Standings
          </Link>
        </div>
      </section>
    </div>
  );
}
