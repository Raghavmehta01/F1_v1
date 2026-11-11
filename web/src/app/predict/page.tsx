import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getActiveSeasonYear,
  getSeasonCalendar,
} from "@/lib/data/jolpica";
import { getPredictions } from "@/lib/data/predict";
import { parseRound, parseSeason } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ season?: string; round?: string }> };

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export default async function PredictPage({ searchParams }: Props) {
  const params = await searchParams;
  const activeYear = await getActiveSeasonYear().catch(
    () => new Date().getUTCFullYear(),
  );
  const season = parseSeason(params.season) ?? activeYear;
  const calendar = await getSeasonCalendar(
    season === activeYear ? "current" : season,
  ).catch(() => []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming =
    calendar.find((r) => r.date >= today) ?? calendar[calendar.length - 1];
  const round =
    parseRound(params.round) ??
    (upcoming ? Number.parseInt(upcoming.round, 10) : 1);

  const race =
    calendar.find((r) => Number.parseInt(r.round, 10) === round) ?? upcoming;
  const data = await getPredictions(season, round);
  const predictions = [...(data.predictions ?? [])].sort(
    (a, b) => a.rank - b.rank,
  );
  const status = data.status ?? "unavailable";

  return (
    <div className="page-wrap space-y-10 py-12 sm:py-16">
      <PageHeader
        eyebrow="Model board"
        title="Predict"
        description={
          race
            ? `Win and podium chances for ${race.raceName} (R${String(round).padStart(2, "0")}).`
            : "Win and podium chances for the selected race weekend."
        }
      >
        <p className="pt-1 font-mono text-[11px] tracking-wide text-[var(--muted)]">
          {data.model_version ? `model ${data.model_version}` : "model —"}
          {status ? ` · ${status}` : ""}
          {data.message ? ` · ${data.message}` : ""}
        </p>
      </PageHeader>

      {data.error && !predictions.length ? (
        <div className="border border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-4 text-sm text-[var(--muted)]">
          {data.error}. Ensure the API is running and{" "}
          <span className="font-mono text-[var(--ink)]">ML_API_URL</span> /{" "}
          <span className="font-mono text-[var(--ink)]">ML_SHARED_SECRET</span>{" "}
          are set.
        </div>
      ) : null}

      {predictions.length ? (
        <div className="overflow-x-auto border border-[var(--line)]">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--bg-elevated)] font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3 text-right">Win</th>
                <th className="px-4 py-3 text-right">Podium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {predictions.map((p) => (
                <tr key={p.driver_id} className="hover:bg-[var(--bg-elevated)]">
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">
                    {String(p.rank).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/drivers/${p.driver_id}`}
                      className="font-medium text-[var(--ink)] hover:text-[var(--brand)]"
                    >
                      {p.driver_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <span className="text-[var(--brand)]">
                      {pct(p.win_probability)}
                    </span>
                    <div className="ml-auto mt-1 h-1 w-full max-w-[7rem] bg-[var(--line)]">
                      <div
                        className="h-1 bg-[var(--brand)]"
                        style={{
                          width: `${Math.min(100, p.win_probability * 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--ink)]">
                    {pct(p.podium_probability)}
                    <div className="ml-auto mt-1 h-1 w-full max-w-[7rem] bg-[var(--line)]">
                      <div
                        className="h-1 bg-[var(--live)]"
                        style={{
                          width: `${Math.min(100, p.podium_probability * 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/standings" className="btn-ghost">
          Standings
        </Link>
        {race ? (
          <Link href={`/races/${season}/${round}`} className="btn-ghost">
            Race weekend
          </Link>
        ) : null}
      </div>
    </div>
  );
}
