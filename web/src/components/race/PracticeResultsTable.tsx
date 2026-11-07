import { DriverAvatar } from "@/components/standings/DriverAvatar";
import type { LeaderboardRow } from "@/lib/data/openf1-live";

function formatLap(sec: number | null): string {
  if (sec == null || Number.isNaN(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  if (m <= 0) return s.toFixed(3);
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

function formatGap(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n === 0) return "LED";
  return `+${n.toFixed(3)}`;
}

export function PracticeResultsTable({ rows }: { rows: LeaderboardRow[] }) {
  if (!rows.length) {
    return (
      <p className="text-[var(--muted)]">
        Practice lap times are not available yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--muted)]">
            <th className="px-2 py-3 font-medium">Pos</th>
            <th className="px-2 py-3 font-medium">Driver</th>
            <th className="px-2 py-3 font-medium">Team</th>
            <th className="px-2 py-3 font-medium font-mono">Best</th>
            <th className="px-2 py-3 font-medium font-mono">Gap</th>
            <th className="px-2 py-3 font-medium font-mono">Laps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.driver_number}
              className="border-b border-[var(--line)]/60 hover:bg-[var(--bg-elevated)]"
            >
              <td className="px-2 py-3 font-mono">{row.position}</td>
              <td className="px-2 py-3">
                <span className="flex items-center gap-3 font-medium">
                  <DriverAvatar
                    src={row}
                    alt={row.full_name}
                    size={48}
                    teamHex={row.team_colour}
                  />
                  <span>
                    <span className="block font-mono text-[10px] tracking-wider text-[var(--muted)]">
                      {row.name_acronym}
                    </span>
                    {row.full_name}
                  </span>
                </span>
              </td>
              <td className="px-2 py-3 text-[var(--muted)]">{row.team_name}</td>
              <td className="px-2 py-3 font-mono">{formatLap(row.best_lap)}</td>
              <td className="px-2 py-3 font-mono text-[var(--live)]">
                {formatGap(row.gap_to_leader)}
              </td>
              <td className="px-2 py-3 font-mono text-[var(--muted)]">
                {row.laps || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
