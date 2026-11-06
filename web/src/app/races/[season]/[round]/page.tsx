import Link from "next/link";
import { CircuitThumb } from "@/components/CircuitThumb";
import { PageHeader } from "@/components/PageHeader";
import { QualifyingTable, RaceResultsTable } from "@/components/ResultsTable";
import { getQualifying, getRaceResults } from "@/lib/jolpica";
import { getDriverMediaIndex } from "@/lib/openf1";
import { parseRound, parseSeason } from "@/lib/validation";
import { notFound } from "next/navigation";

export const revalidate = 120;

type Props = {
  params: Promise<{ season: string; round: string }>;
};

export default async function RacePage({ params }: Props) {
  const { season: s, round: r } = await params;
  const season = parseSeason(s);
  const round = parseRound(r);
  if (season == null || round == null) notFound();

  const [race, quali, media] = await Promise.all([
    getRaceResults(season, round),
    getQualifying(season, round).catch(() => null),
    getDriverMediaIndex().catch(() => null),
  ]);

  const meta = race ?? quali;
  if (!meta) {
    return (
      <div className="page-wrap space-y-6 py-16">
        <PageHeader
          eyebrow={`${season} · Round ${round}`}
          title="No results yet"
          description="This weekend has not been published to the results feed."
        />
        <Link href="/calendar" className="btn-ghost inline-flex">
          Back to calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="page-wrap space-y-12 py-12 sm:py-16">
      <header className="grid gap-8 lg:grid-cols-[240px_1fr] lg:items-end">
        <CircuitThumb
          circuitId={meta.Circuit.circuitId}
          alt={meta.Circuit.circuitName}
          className="border border-[var(--line)]"
        />
        <div className="space-y-4">
          <p className="eyebrow">
            {season} · Round {round}
          </p>
          <h1 className="font-display text-4xl tracking-tight sm:text-6xl">
            {meta.raceName}
          </h1>
          <p className="text-[var(--muted)]">
            <Link
              href={`/circuits/${meta.Circuit.circuitId}`}
              className="hover:text-[var(--brand)]"
            >
              {meta.Circuit.circuitName}
            </Link>
            {" · "}
            {meta.Circuit.Location.locality}, {meta.Circuit.Location.country}
            {" · "}
            <span className="font-mono text-[var(--ink)]">{meta.date}</span>
          </p>
        </div>
      </header>

      <section className="space-y-5">
        <h2 className="eyebrow">Race</h2>
        <RaceResultsTable rows={race?.Results ?? []} media={media} />
      </section>

      <section className="space-y-5">
        <h2 className="eyebrow">Qualifying</h2>
        <QualifyingTable rows={quali?.QualifyingResults ?? []} media={media} />
      </section>
    </div>
  );
}
