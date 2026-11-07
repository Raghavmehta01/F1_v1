import Link from "next/link";
import { DriverAvatar } from "@/components/standings/DriverAvatar";
import { fullDriverImage, mediaFromStanding } from "@/lib/media";
import { matchOpenF1Driver, type DriverMediaIndex } from "@/lib/data/openf1";
import { teamColor } from "@/lib/media/team-colors";
import type { QualifyingResult, RaceResult } from "@/lib/data/types";

export function RaceResultsTable({
  rows,
  media,
}: {
  rows: RaceResult[];
  media?: DriverMediaIndex | null;
}) {
  if (!rows.length) {
    return <p className="text-[var(--muted)]">Results not available yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <th className="px-2 py-3 font-medium">Pos</th>
            <th className="px-2 py-3 font-medium">Driver</th>
            <th className="px-2 py-3 font-medium">Team</th>
            <th className="px-2 py-3 font-medium font-mono">Grid</th>
            <th className="px-2 py-3 font-medium font-mono">Time</th>
            <th className="px-2 py-3 font-medium font-mono">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const of1 = media
              ? matchOpenF1Driver(media, {
                  code: row.Driver.code,
                  familyName: row.Driver.familyName,
                })
              : null;
            return (
              <tr
                key={row.Driver.driverId}
                className="border-b border-[var(--line)]/60 hover:bg-[var(--bg-elevated)]"
              >
                <td className="px-2 py-3 font-mono">{row.position}</td>
                <td className="px-2 py-3">
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
                          constructorId: row.Constructor.constructorId,
                          constructorName: row.Constructor.name,
                        }),
                      )}
                      alt={`${row.Driver.givenName} ${row.Driver.familyName}`}
                      size={48}
                      teamHex={of1?.team_colour}
                    />
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-1"
                        style={{
                          backgroundColor: teamColor(
                            row.Constructor.constructorId,
                          ),
                        }}
                        aria-hidden
                      />
                      {row.Driver.givenName} {row.Driver.familyName}
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-3 text-[var(--muted)]">
                  {row.Constructor.name}
                </td>
                <td className="px-2 py-3 font-mono text-[var(--muted)]">
                  {row.grid}
                </td>
                <td className="px-2 py-3 font-mono">
                  {row.Time?.time ?? row.status}
                </td>
                <td className="px-2 py-3 font-mono">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function QualifyingTable({
  rows,
  media,
}: {
  rows: QualifyingResult[];
  media?: DriverMediaIndex | null;
}) {
  if (!rows.length) {
    return <p className="text-[var(--muted)]">Qualifying not available yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <th className="px-2 py-3 font-medium">Pos</th>
            <th className="px-2 py-3 font-medium">Driver</th>
            <th className="px-2 py-3 font-medium font-mono">Q1</th>
            <th className="px-2 py-3 font-medium font-mono">Q2</th>
            <th className="px-2 py-3 font-medium font-mono">Q3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const of1 = media
              ? matchOpenF1Driver(media, {
                  code: row.Driver.code,
                  familyName: row.Driver.familyName,
                })
              : null;
            return (
              <tr
                key={row.Driver.driverId}
                className="border-b border-[var(--line)]/60 hover:bg-[var(--bg-elevated)]"
              >
                <td className="px-2 py-3 font-mono">{row.position}</td>
                <td className="px-2 py-3">
                  <span className="flex items-center gap-3 font-medium">
                    <DriverAvatar
                      src={fullDriverImage(
                        mediaFromStanding({
                          of1,
                          code: row.Driver.code,
                          driverId: row.Driver.driverId,
                          constructorId: row.Constructor.constructorId,
                          constructorName: row.Constructor.name,
                        }),
                      )}
                      alt={`${row.Driver.givenName} ${row.Driver.familyName}`}
                      size={48}
                      teamHex={of1?.team_colour}
                    />
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-1"
                        style={{
                          backgroundColor: teamColor(
                            row.Constructor.constructorId,
                          ),
                        }}
                        aria-hidden
                      />
                      {row.Driver.givenName} {row.Driver.familyName}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-3 font-mono text-[var(--muted)]">
                  {row.Q1 ?? "—"}
                </td>
                <td className="px-2 py-3 font-mono text-[var(--muted)]">
                  {row.Q2 ?? "—"}
                </td>
                <td className="px-2 py-3 font-mono">{row.Q3 ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
