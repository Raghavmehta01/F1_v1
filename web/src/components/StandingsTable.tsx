import Link from "next/link";
import { DriverAvatar } from "@/components/DriverAvatar";
import { SafeImage } from "@/components/SafeImage";
import {
  cloudinaryTeamLogo,
  fullDriverImage,
  mediaFromStanding,
} from "@/lib/media";
import { matchOpenF1Driver, type DriverMediaIndex } from "@/lib/openf1";
import { teamColor } from "@/lib/team-colors";
import type { ConstructorStanding, DriverStanding } from "@/lib/types";

export function DriverStandingsTable({
  rows,
  media,
}: {
  rows: DriverStanding[];
  media?: DriverMediaIndex | null;
}) {
  if (!rows.length) {
    return (
      <p className="text-[var(--muted)]">No standings yet for this season.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[40rem]">
        <thead>
          <tr>
            <th className="w-14">Pos</th>
            <th>Driver</th>
            <th>Team</th>
            <th className="font-mono">Pts</th>
            <th className="font-mono">Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const team = row.Constructors?.[0];
            const color = teamColor(team?.constructorId);
            const of1 = media
              ? matchOpenF1Driver(media, {
                  code: row.Driver.code,
                  familyName: row.Driver.familyName,
                  number: row.Driver.permanentNumber,
                })
              : null;
            return (
              <tr
                key={row.Driver.driverId}
                className="animate-row-in"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <td className="font-mono text-base text-[var(--ink)]">
                  {row.position.padStart(2, "0")}
                </td>
                <td>
                  <Link
                    href={`/drivers/${row.Driver.driverId}`}
                    className="flex items-center gap-3 font-medium hover:text-[var(--brand)]"
                  >
                    <DriverAvatar
                      src={fullDriverImage(
                        mediaFromStanding({
                          of1,
                          code: row.Driver.code,
                          driverId: row.Driver.driverId,
                          constructorId: team?.constructorId,
                          constructorName: team?.name,
                        }),
                      )}
                      alt={`${row.Driver.givenName} ${row.Driver.familyName}`}
                      size={56}
                      teamHex={of1?.team_colour}
                    />
                    <span>
                      <span className="block text-[var(--ink)]">
                        {row.Driver.givenName}{" "}
                        <span className="font-semibold">
                          {row.Driver.familyName}
                        </span>
                      </span>
                      {row.Driver.code ? (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          {row.Driver.code}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="text-[var(--muted)]">
                  {team ? (
                    <Link
                      href={`/constructors/${team.constructorId}`}
                      className="inline-flex items-center gap-2 hover:text-[var(--ink)]"
                    >
                      <span
                        className="inline-block h-3 w-[3px]"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      {team.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="font-mono text-base">{row.points}</td>
                <td className="font-mono text-[var(--muted)]">{row.wins}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ConstructorStandingsTable({
  rows,
}: {
  rows: ConstructorStanding[];
}) {
  if (!rows.length) {
    return (
      <p className="text-[var(--muted)]">No constructor standings yet.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table min-w-[28rem]">
        <thead>
          <tr>
            <th className="w-14">Pos</th>
            <th>Constructor</th>
            <th className="font-mono">Pts</th>
            <th className="font-mono">Wins</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const color = teamColor(row.Constructor.constructorId);
            const logo = cloudinaryTeamLogo({
              constructorId: row.Constructor.constructorId,
              width: 96,
            });
            return (
              <tr
                key={row.Constructor.constructorId}
                className="animate-row-in"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <td className="font-mono">{row.position.padStart(2, "0")}</td>
                <td>
                  <Link
                    href={`/constructors/${row.Constructor.constructorId}`}
                    className="inline-flex items-center gap-3 font-medium hover:text-[var(--brand)]"
                  >
                    <span
                      className="hero-media-bay relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden"
                      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                    >
                      {logo ? (
                        <SafeImage
                          src={logo}
                          alt=""
                          width={72}
                          height={72}
                          className="h-7 w-7 object-contain p-0.5"
                          fallback={
                            <span
                              className="h-3 w-[3px]"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                          }
                        />
                      ) : (
                        <span
                          className="h-3 w-[3px]"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                      )}
                    </span>
                    {row.Constructor.name}
                  </Link>
                </td>
                <td className="font-mono text-base">{row.points}</td>
                <td className="font-mono text-[var(--muted)]">{row.wins}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
