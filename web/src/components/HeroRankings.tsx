import Link from "next/link";
import { DriverPortrait } from "@/components/DriverPortrait";

export type HeroRankDriver = {
  id: string;
  name: string;
  points: string;
  pos: string;
  color: string;
  shot: string | null;
};

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
    <div className="animate-hero-rise-delay w-full min-w-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Championship</p>
          <p className="font-mono text-[11px] tracking-wider text-[var(--muted)]">
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

      <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {drivers.map((d, i) => (
          <li
            key={d.id}
            className="animate-row-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <Link
              href={`/drivers/${d.id}`}
              className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
            >
              <span className="w-6 shrink-0 font-mono text-xs text-[var(--muted)] sm:w-7 sm:text-sm">
                {d.pos.padStart(2, "0")}
              </span>
              <DriverPortrait
                src={d.shot}
                alt={d.name}
                accent={d.color}
                className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
                sizes="48px"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ink)] group-hover:text-[var(--brand)]">
                {d.name}
              </span>
              <span className="shrink-0 font-mono text-sm text-[var(--ink)]">
                {d.points}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
