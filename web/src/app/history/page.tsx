import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getSeasons } from "@/lib/jolpica";

export const revalidate = 86400;

export default async function HistoryPage() {
  const seasons = await getSeasons();

  return (
    <div className="page-wrap space-y-12 py-12 sm:py-16">
      <PageHeader
        eyebrow="Archive"
        title="History"
        description="Every championship season — jump into standings for that year."
      />
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {seasons.map((s, i) => (
          <li
            key={s}
            className="animate-row-in"
            style={{ animationDelay: `${Math.min(i, 20) * 15}ms` }}
          >
            <Link
              href={`/standings?season=${s}`}
              className="block border border-[var(--line)] px-2 py-3.5 text-center font-mono text-sm text-[var(--muted)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              {s}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
