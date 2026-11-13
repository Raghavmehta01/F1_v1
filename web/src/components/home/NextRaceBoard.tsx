import Link from "next/link";
import { CircuitLightsMap } from "@/components/home/CircuitLightsMap";
import type { Race } from "@/lib/data/types";

type Props = {
  race: Race;
  status: "upcoming" | "completed";
  seasonTotal?: number;
  className?: string;
};

/** Next-race strip with animated circuit — sits below the poster hero. */
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
      ? `Round ${String(round).padStart(2, "0")} · Up next`
      : `Round ${String(round).padStart(2, "0")} · Latest`;

  return (
    <section className={`bg-[var(--bg-elevated)] ${className}`}>
      <div className="grid md:grid-cols-2 md:items-stretch">
        <div className="flex flex-col justify-center gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand)]">
              {eyebrow}
              {loc.country ? ` · ${loc.country}` : ""}
            </p>
            <h2 className="font-display text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
              {race.raceName}
            </h2>
            <p className="max-w-md text-sm text-[var(--muted)]">
              {race.Circuit.circuitName}
              {loc.locality ? ` · ${loc.locality}` : ""}
              {Number.isFinite(seasonTotal) && seasonTotal! > 0
                ? ` · ${round} of ${seasonTotal}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/races/${race.season}/${race.round}`}
              className="btn-primary"
            >
              Race weekend
            </Link>
            <Link
              href={`/circuits/${race.Circuit.circuitId}`}
              className="btn-ghost"
            >
              Explore track
            </Link>
          </div>
        </div>
        <CircuitLightsMap
          circuitId={race.Circuit.circuitId}
          label={race.Circuit.circuitName}
          className="min-h-[14rem] border-t border-[var(--line)] md:min-h-[20rem] md:border-l md:border-t-0"
        />
      </div>
    </section>
  );
}
