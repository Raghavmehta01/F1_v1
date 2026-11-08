import Link from "next/link";
import { DriverPortrait } from "@/components/standings/DriverPortrait";

export type HeroRankDriver = {
  id: string;
  name: string;
  team?: string;
  points: string;
  pos: string;
  color: string;
  shot: string | null;
};

/** Top-five driver list for the below-fold championship block. */
export function HeroRankings({
  drivers,
  round,
  season,
}: {
  drivers: HeroRankDriver[];
  round: string;
  season: string;
}) {
  if (!drivers.length) return null;

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Championship</p>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Top five
          </h2>
          <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)]">
            R{round}
            {season ? ` · ${season}` : ""}
          </p>
        </div>
        <Link href="/standings" className="btn-ghost">
          Full standings
        </Link>
      </div>

      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {drivers.map((d, i) => (
          <li
            key={d.id}
            className="animate-row-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Link
              href={`/drivers/${d.id}`}
              className="group flex items-center gap-4 py-3.5 transition-colors hover:bg-[var(--bg-elevated)] sm:gap-5 sm:py-4"
            >
              <span className="w-8 shrink-0 font-mono text-sm text-[var(--muted)] sm:w-10 sm:text-base">
                {d.pos.padStart(2, "0")}
              </span>
              <DriverPortrait
                src={d.shot}
                alt={d.name}
                accent={d.color}
                className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                sizes="64px"
              />
              <span className="min-w-0 flex-1 truncate text-base font-medium text-[var(--ink)] group-hover:text-[var(--brand)] sm:text-lg">
                {d.name}
              </span>
              {d.team ? (
                <span className="min-w-0 max-w-[40%] truncate text-right text-sm text-[var(--muted)] sm:max-w-[16rem] sm:text-left">
                  {d.team}
                </span>
              ) : null}
              <span className="shrink-0 font-mono text-base text-[var(--ink)] sm:text-lg">
                {d.points}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
