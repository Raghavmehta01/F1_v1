import Link from "next/link";
import { CircuitLightsMap } from "@/components/home/CircuitLightsMap";
import type { Race } from "@/lib/data/types";

type Props = {
  race: Race;
  status: "upcoming" | "completed";
  seasonTotal?: number;
  /** Fill a hero column (no outer section padding). */
  className?: string;
};

/** Compact next-race panel: animated circuit + links — for use inside the hero. */
export function NextRaceBoard({
  race,
  status,
  seasonTotal,
  className = "",
}: Props) {
  const round = Number.parseInt(race.round, 10);
  const loc = race.Circuit.Location;
  const eyebrow =
    status === "upcoming"
      ? `R${String(round).padStart(2, "0")} · Up next`
      : `R${String(round).padStart(2, "0")} · Latest`;

  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-[var(--bg-elevated)] ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brand)]">
            {eyebrow}
            {loc.country ? ` · ${loc.country}` : ""}
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--muted)]">
            {race.Circuit.circuitName}
            {Number.isFinite(seasonTotal) && seasonTotal! > 0
              ? ` · ${round}/${seasonTotal}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/races/${race.season}/${race.round}`}
            className="btn-primary !px-3 !py-1.5 !text-[10px]"
          >
            Weekend
          </Link>
          <Link
            href={`/circuits/${race.Circuit.circuitId}`}
            className="btn-ghost !px-3 !py-1.5 !text-[10px]"
          >
            Track
          </Link>
        </div>
      </div>
      <CircuitLightsMap
        circuitId={race.Circuit.circuitId}
        label={race.Circuit.circuitName}
        className="min-h-0 flex-1 !aspect-auto border-0 bg-transparent"
      />
    </div>
  );
}
