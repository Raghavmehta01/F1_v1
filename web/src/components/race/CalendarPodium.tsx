import { DriverPortrait } from "@/components/standings/DriverPortrait";
import type { PodiumSlot } from "@/lib/data/jolpica";
import { teamColor } from "@/lib/media/team-colors";

const ORDINAL: Record<string, string> = {
  "1": "ST",
  "2": "ND",
  "3": "RD",
};

export function CalendarPodium({
  podium,
  shots,
}: {
  podium: PodiumSlot[];
  shots: Record<string, string | null>;
}) {
  if (!podium.length) return null;

  return (
    <div
      className="flex min-w-0 items-stretch gap-px bg-[var(--line)]"
      aria-label="Podium"
    >
      {podium.map((slot) => {
        const accent = teamColor(slot.constructorId);
        return (
          <div
            key={slot.position}
            className="flex min-w-0 flex-1 items-center gap-2.5 bg-[var(--bg)] px-2.5 py-2 sm:px-3"
          >
            <div className="shrink-0 text-center leading-none">
              <p className="font-display text-xl tracking-tight text-[var(--ink)] sm:text-2xl">
                {slot.position}
                <span className="ml-0.5 align-top font-mono text-[8px] tracking-wider text-[var(--muted)]">
                  {ORDINAL[slot.position]}
                </span>
              </p>
            </div>
            <DriverPortrait
              src={shots[slot.driverId]}
              alt={slot.name}
              accent={accent}
              className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
              sizes="40px"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs font-medium tracking-wide text-[var(--ink)] sm:text-sm">
                {slot.code}
              </p>
              <p className="truncate font-mono text-[10px] text-[var(--muted)] sm:text-[11px]">
                {slot.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
