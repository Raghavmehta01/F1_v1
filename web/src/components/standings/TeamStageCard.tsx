import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  cloudinaryTeamCar,
  cloudinaryTeamLogo,
  fullDriverImage,
  mediaFromStanding,
} from "@/lib/media";
import { matchOpenF1Driver, type DriverMediaIndex } from "@/lib/data/openf1";
import { teamContrast, teamStageFill, teamStageInk } from "@/lib/media/team-colors";
import type { ConstructorStanding, DriverStanding } from "@/lib/data/types";

type Props = {
  row: ConstructorStanding;
  drivers: DriverStanding[];
  media?: DriverMediaIndex | null;
  index?: number;
};

export function TeamStageCard({ row, drivers, media, index = 0 }: Props) {
  const id = row.Constructor.constructorId;
  const fill = teamStageFill(id);
  const ink = teamStageInk(id);
  const contrast = teamContrast(id);
  const car = cloudinaryTeamCar({ constructorId: id, width: 900 });
  const logo = cloudinaryTeamLogo({ constructorId: id, width: 256 });
  const pair = drivers.slice(0, 2);

  return (
    <Link
      href={`/constructors/${id}`}
      className="stage-card team-halftone group relative flex min-h-[17rem] flex-col justify-between overflow-hidden p-5 sm:min-h-[19rem] sm:p-6"
      style={{
        backgroundColor: fill,
        color: ink,
        animationDelay: `${Math.min(index, 10) * 40}ms`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(160deg, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.06) 45%, rgba(0,0,0,0.2) 100%)",
        }}
        aria-hidden
      />

      {/* Header row: meta left · logo right — no absolute overlap */}
      <div className="relative z-[2] flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-mono text-[11px] tracking-[0.2em] text-white/90">
              P{row.position.padStart(2, "0")} · {row.points} PTS
            </p>
            <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-white/90">
              {row.wins}W
            </p>
          </div>
          <h3 className="font-display text-2xl leading-none tracking-tight text-white sm:text-3xl">
            {row.Constructor.name}
          </h3>
          <ul className="flex max-w-md flex-col gap-2">
            {pair.map((d) => {
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
                  constructorId: id,
                  constructorName: row.Constructor.name,
                }),
              );
              return (
                <li key={d.Driver.driverId} className="mirror-chip pr-3">
                  <span
                    className="h-9 w-[3px] shrink-0 self-stretch"
                    style={{ backgroundColor: contrast }}
                    aria-hidden
                  />
                  <span className="mirror-chip-photo">
                    {shot ? (
                      <SafeImage
                        src={shot}
                        alt=""
                        fill
                        sizes="40px"
                        className="portrait-hover object-cover object-[68%_top]"
                        fallback={
                          <span className="absolute inset-0 bg-black/30" />
                        }
                      />
                    ) : (
                      <span className="absolute inset-0 bg-black/30" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate py-1.5 text-sm text-white">
                    <span className="text-white/75">{d.Driver.givenName} </span>
                    <span className="font-semibold tracking-tight">
                      {d.Driver.familyName}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {logo ? (
          <span className="relative h-14 w-14 shrink-0 sm:h-[4.25rem] sm:w-[4.25rem]">
            <SafeImage
              src={logo}
              alt=""
              fill
              sizes="80px"
              className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
              fallback={null}
            />
          </span>
        ) : null}
      </div>

      {car ? (
        <div className="car-drive-track relative z-[2] mt-4 h-24 w-full sm:h-28">
          <SafeImage
            src={car}
            alt=""
            fill
            sizes="400px"
            className="car-drive object-contain object-right will-change-transform"
            fallback={null}
          />
        </div>
      ) : null}
    </Link>
  );
}

export function TeamStageGrid({
  rows,
  driverStandings,
  media,
}: {
  rows: ConstructorStanding[];
  driverStandings: DriverStanding[];
  media?: DriverMediaIndex | null;
}) {
  if (!rows.length) {
    return (
      <p className="text-[var(--muted)]">No constructor standings yet.</p>
    );
  }

  const byTeam = new Map<string, DriverStanding[]>();
  for (const d of driverStandings) {
    const cid = d.Constructors?.[0]?.constructorId;
    if (!cid) continue;
    const list = byTeam.get(cid) ?? [];
    list.push(d);
    byTeam.set(cid, list);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row, i) => (
        <TeamStageCard
          key={row.Constructor.constructorId}
          row={row}
          drivers={byTeam.get(row.Constructor.constructorId) ?? []}
          media={media}
          index={i}
        />
      ))}
    </div>
  );
}
