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
  className = "",
}: {
  driver: HeroDriverLead | null;
  constructor: HeroConstructorLead | null;
  round: string;
  season: string;
  className?: string;
}) {
  if (!driver && !ctor) return null;

  return (
    <div className={`animate-hero-rise-delay w-full max-w-xl space-y-3 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Leaders</p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-[var(--muted)]">
            R{round}
            {season ? ` · ${season}` : ""}
          </p>
        </div>
        <Link
          href="/standings"
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] transition-colors hover:text-[var(--brand)]"
        >
          Standings →
        </Link>
      </div>

      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {driver ? (
          <Link
            href={`/drivers/${driver.id}`}
            className="group grid grid-cols-[3rem_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_55%,transparent)]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Driver
            </span>
            <DriverPortrait
              src={driver.shot}
              alt={driver.name}
              accent={driver.color}
              className="h-9 w-9"
              sizes="36px"
            />
            <span className="min-w-0 truncate text-sm text-[var(--ink)] group-hover:text-[var(--brand)]">
              {driver.name}
            </span>
            <span className="font-mono text-sm tabular-nums text-[var(--ink)]">
              {driver.points}
            </span>
          </Link>
        ) : null}

        {ctor ? (
          <Link
            href={`/constructors/${ctor.id}`}
            className="group grid grid-cols-[3rem_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-elevated)_55%,transparent)]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Team
            </span>
            <TeamLogoChip
              src={ctor.logo}
              accent={ctor.color}
              className="h-9 w-9"
              sizes="36px"
            />
            <span className="min-w-0 truncate text-sm text-[var(--ink)] group-hover:text-[var(--brand)]">
              {ctor.name}
            </span>
            <span className="font-mono text-sm tabular-nums text-[var(--ink)]">
              {ctor.points}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
