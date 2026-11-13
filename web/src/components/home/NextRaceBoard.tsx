import Link from "next/link";
import { CircuitLightsMap } from "@/components/home/CircuitLightsMap";
import { SessionCountdown } from "@/components/home/SessionCountdown";
import type { Race } from "@/lib/data/types";

type Props = {
  race: Race;
  status: "upcoming" | "completed";
  countdownIso?: string | null;
  countdownLabel?: string | null;
  seasonTotal?: number;
};

export function NextRaceBoard({
  race,
  status,
  countdownIso,
  countdownLabel,
  seasonTotal,
}: Props) {
  const round = Number.parseInt(race.round, 10);
  const loc = race.Circuit.Location;
  const eyebrow =
    status === "upcoming"
      ? `Round ${String(round).padStart(2, "0")} · Up next`
      : `Round ${String(round).padStart(2, "0")} · Latest`;

  return (
    <section className="border-t border-[var(--line)]">
      <div className="page-wrap py-12 sm:py-14">
        <div className="grid items-stretch gap-0 border border-[var(--line)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex flex-col justify-between gap-8 bg-[var(--bg-elevated)] p-6 sm:p-8 lg:p-10">
            <div className="space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand)]">
                {eyebrow}
                {loc.country ? ` · ${loc.country}` : ""}
              </p>
              <h2 className="font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl lg:text-[2.75rem]">
                {race.raceName}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {race.Circuit.circuitName}
                {loc.locality ? ` · ${loc.locality}` : ""}
                {Number.isFinite(seasonTotal) && seasonTotal! > 0
                  ? ` · Round ${round} of ${seasonTotal}`
                  : ""}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetaChip label="Country" value={loc.country || "—"} />
              <MetaChip label="Locality" value={loc.locality || "—"} />
              <MetaChip label="Date" value={race.date} />
              <MetaChip
                label="Round"
                value={String(round).padStart(2, "0")}
              />
            </div>

            <div className="flex flex-wrap gap-3">
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

          <div className="relative flex min-h-[16rem] flex-col border-t border-[var(--line)] lg:border-l lg:border-t-0">
            <CircuitLightsMap
              circuitId={race.Circuit.circuitId}
              label={race.Circuit.circuitName}
              className="min-h-[16rem] flex-1 border-0"
            />
            {status === "upcoming" && countdownIso ? (
              <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4">
                <SessionCountdown
                  targetIso={countdownIso}
                  label={
                    countdownLabel
                      ? `Lights out · ${countdownLabel}`
                      : "Lights out"
                  }
                  className="border-[var(--line)]/80 bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur-sm"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs text-[var(--ink)] sm:text-sm">
        {value}
      </p>
    </div>
  );
}
