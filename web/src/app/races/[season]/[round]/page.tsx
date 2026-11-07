import Link from "next/link";
import { CircuitThumb } from "@/components/race/CircuitThumb";
import { PageHeader } from "@/components/layout/PageHeader";
import { RaceWeekendTabs } from "@/components/race/RaceWeekendTabs";
import { getRaceWeekend } from "@/lib/data/jolpica";
import { getWeekendPracticeBoards } from "@/lib/data/openf1-live";
import { getDriverMediaIndex } from "@/lib/data/openf1";
import { parseRound, parseSeason } from "@/lib/security/validation";
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

  const [weekend, media] = await Promise.all([
    getRaceWeekend(season, round),
    getDriverMediaIndex().catch(() => null),
  ]);

  const meta = weekend.meta;
  if (!meta) {
    return (
      <div className="page-wrap space-y-6 py-16">
        <PageHeader
          eyebrow={`${season} · Round ${round}`}
          title="No results yet"
          description="Results for this weekend are not available yet."
        />
        <Link href="/calendar" className="btn-ghost inline-flex">
          Back to calendar
        </Link>
      </div>
    );
  }

  const practices = await getWeekendPracticeBoards(
    weekend.schedule ?? meta,
  ).catch(() => []);

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

      <RaceWeekendTabs
        schedule={weekend.schedule}
        race={weekend.race}
        quali={weekend.quali}
        sprint={weekend.sprint}
        practices={practices}
        media={media}
      />
    </div>
  );
}
