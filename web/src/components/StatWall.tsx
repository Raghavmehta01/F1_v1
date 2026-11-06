type Stat = { label: string; value: string };

export function StatWall({
  title,
  stats,
  className = "",
}: {
  title?: string;
  stats: Stat[];
  className?: string;
}) {
  if (!stats.length) return null;
  return (
    <div className={`space-y-6 ${className}`}>
      {title ? (
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
          {title}
        </h2>
      ) : null}
      <dl className="stat-wall grid grid-cols-2 gap-x-8 gap-y-0">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-b border-[var(--line)] py-5 first:border-t col-span-1"
          >
            <dt className="mb-2">{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
