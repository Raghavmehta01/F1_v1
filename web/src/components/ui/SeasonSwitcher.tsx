import Link from "next/link";

export function SeasonSwitcher({
  seasons,
  current,
  makeHref,
  limit = 10,
}: {
  seasons: string[];
  current: string;
  makeHref: (season: string) => string;
  limit?: number;
}) {
  const years = (seasons.length ? seasons : [current]).slice(0, limit);
  return (
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Season">
      {years.map((s) => (
        <Link
          key={s}
          href={makeHref(s)}
          className={`border px-3 py-1.5 font-mono text-xs tracking-wide transition-colors ${
            current === s
              ? "border-[var(--brand)] text-[var(--brand)]"
              : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
          }`}
        >
          {s}
        </Link>
      ))}
    </div>
  );
}
