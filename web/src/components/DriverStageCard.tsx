import Link from "next/link";
import { SafeImage } from "@/components/SafeImage";
import {
  cloudinaryTeamLogo,
  fullDriverImage,
  mediaFromStanding,
} from "@/lib/media";
import type { OpenF1Driver } from "@/lib/openf1";
import { teamStageFill } from "@/lib/team-colors";
import type { DriverStanding } from "@/lib/types";

type Props = {
  row: DriverStanding;
  of1?: OpenF1Driver | null;
  index?: number;
};

export function DriverStageCard({ row, of1, index = 0 }: Props) {
  const team = row.Constructors?.[0];
  const id = team?.constructorId;
  const fill = teamStageFill(id);
  const logo = cloudinaryTeamLogo({
    constructorId: id,
    teamName: team?.name,
    width: 64,
    variant: "white",
  });
  const shot = fullDriverImage(
    mediaFromStanding({
      of1,
      code: row.Driver.code,
      driverId: row.Driver.driverId,
      constructorId: team?.constructorId,
      constructorName: team?.name,
    }),
  );
  const number =
    row.Driver.permanentNumber ??
    (of1?.driver_number != null ? String(of1.driver_number) : "—");

  return (
    <Link
      href={`/drivers/${row.Driver.driverId}`}
      className="stage-card team-halftone group relative flex min-h-[12.5rem] overflow-hidden text-white sm:min-h-[14.5rem]"
      style={{
        backgroundColor: fill,
        animationDelay: `${Math.min(index, 12) * 35}ms`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(110deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0.05) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-[2] flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.18em] text-white/85">
            P{row.position.padStart(2, "0")} · {row.points} PTS
          </p>
          <h3 className="mt-2 font-display text-xl leading-none tracking-tight text-white sm:text-2xl">
            {row.Driver.givenName}
            <br />
            {row.Driver.familyName}
          </h3>
          <p className="mt-2 text-sm text-white/80">{team?.name ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          {logo ? (
            <span className="relative h-6 w-6 shrink-0 opacity-90 sm:h-7 sm:w-7">
              <SafeImage
                src={logo}
                alt=""
                fill
                sizes="28px"
                className="object-contain object-center"
                fallback={null}
              />
            </span>
          ) : null}
          <p className="font-mono text-[10px] uppercase leading-none tracking-[0.16em] text-white/65">
            {row.Driver.nationality ?? row.Driver.code ?? ""}
          </p>
        </div>
      </div>

      <span
        className="pointer-events-none absolute bottom-1 left-3 z-[1] font-display text-[5.5rem] leading-none tracking-tighter text-white/20 sm:text-[7rem]"
        aria-hidden
      >
        {number}
      </span>

      <div className="relative z-[2] w-[42%] shrink-0 self-stretch sm:w-[46%]">
        {shot ? (
          <SafeImage
            src={shot}
            alt=""
            fill
            sizes="220px"
            className="portrait-hover object-cover object-[68%_top]"
            fallback={null}
          />
        ) : (
          <span className="absolute inset-0 bg-black/10" />
        )}
      </div>
    </Link>
  );
}

export function DriverStageGrid({
  rows,
  resolve,
}: {
  rows: DriverStanding[];
  resolve: (row: DriverStanding) => OpenF1Driver | null;
}) {
  if (!rows.length) {
    return (
      <p className="text-[var(--muted)]">No standings yet for this season.</p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row, i) => (
        <DriverStageCard
          key={row.Driver.driverId}
          row={row}
          of1={resolve(row)}
          index={i}
        />
      ))}
    </div>
  );
}
