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

      <div className="grid gap-2">
        {driver ? (
          <Link
            href={`/drivers/${driver.id}`}
            className="group flex items-center gap-3 border border-[var(--line)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Driver
            </span>
            <DriverPortrait
              src={driver.shot}
              alt={driver.name}
              accent={driver.color}
              className="h-11 w-11 shrink-0"
              sizes="44px"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--brand)] sm:text-base">
              {driver.name}
            </span>
            <span className="shrink-0 font-mono text-sm text-[var(--ink)] sm:text-base">
              {driver.points}
            </span>
          </Link>
        ) : null}

        {ctor ? (
          <Link
            href={`/constructors/${ctor.id}`}
            className="group flex items-center gap-3 border border-[var(--line)] px-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <span className="w-12 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Team
            </span>
            <TeamLogoChip
              src={ctor.logo}
              accent={ctor.color}
              className="h-11 w-11"
              sizes="44px"
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--brand)] sm:text-base">
              {ctor.name}
            </span>
            <span className="shrink-0 font-mono text-sm text-[var(--ink)] sm:text-base">
              {ctor.points}
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
