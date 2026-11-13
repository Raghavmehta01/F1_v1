import Link from "next/link";
import { DriverPortrait } from "@/components/standings/DriverPortrait";
import { TeamLogoChip } from "@/components/standings/TeamLogoChip";

export type HeroDriverLead = {
  id: string;
  name: string;
  points: string;
  color: string;
  shot: string | null;
};

export type HeroConstructorLead = {
  id: string;
  name: string;
  points: string;
  color: string;
  logo: string | null;
};

/** Compact P1 driver + P1 constructor for the hero. */
export function HeroLeaders({
  driver,
  constructor: ctor,
  round,
  season,
}: {
  driver: HeroDriverLead | null;
  constructor: HeroConstructorLead | null;
  round: string;
  season: string;
}) {
  if (!driver && !ctor) return null;

  return (
    <div className="animate-hero-rise-delay w-full space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Leaders</p>
          <p className="mt-1 font-mono text-[11px] tracking-wider text-[var(--muted)]">
            R{round}
            {season ? ` · ${season}` : ""}
          </p>
        </div>
        <Link
          href="/standings"
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--brand)]"
        >
          Full →
        </Link>
      </div>

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {driver ? (
          <Link
            href={`/drivers/${driver.id}`}
            className="group grid grid-cols-[3.1rem_2rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_55%,transparent)] sm:grid-cols-[3.5rem_2.5rem_minmax(0,1fr)_auto] sm:gap-x-3"
          >
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Driver
            </span>
            <DriverPortrait
              src={driver.shot}
              alt={driver.name}
              accent={driver.color}
              className="h-9 w-9 sm:h-11 sm:w-11"
              sizes="44px"
            />
            <span className="min-w-0 truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--brand)] sm:text-base">
              {driver.name}
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--ink)] sm:text-base">
              {driver.points}
            </span>
          </Link>
        ) : null}

        {ctor ? (
          <Link
            href={`/constructors/${ctor.id}`}
            className="group grid grid-cols-[3.1rem_2rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_55%,transparent)] sm:grid-cols-[3.5rem_2.5rem_minmax(0,1fr)_auto] sm:gap-x-3"
          >
            <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Team
            </span>
            <TeamLogoChip
              src={ctor.logo}
              accent={ctor.color}
              className="h-9 w-9 sm:h-11 sm:w-11"
              sizes="44px"
            />
            <span className="min-w-0 truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--brand)] sm:text-base">
              {ctor.name}
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--ink)] sm:text-base">
              {ctor.points}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
