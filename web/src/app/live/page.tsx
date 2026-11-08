import { LiveBoard } from "@/components/live/LiveBoard";
import { SessionCountdown } from "@/components/home/SessionCountdown";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeasonSwitcher } from "@/components/ui/SeasonSwitcher";
import { getSeasonCalendar, getSeasons } from "@/lib/data/jolpica";
import { findNextSession } from "@/lib/data/next-session";
import {
  getLiveSnapshot,
  getSessionsWithStatus,
  pickDefaultSession,
  resolveOpenF1Season,
} from "@/lib/data/openf1-live";
import { parseSeason } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ season?: string }> };

export default async function LivePage({ searchParams }: Props) {
  const params = await searchParams;
  let initial = null;
  let sessions: Awaited<ReturnType<typeof getSessionsWithStatus>> = [];
  let season = parseSeason(params.season) ?? new Date().getUTCFullYear();
  let loadError: string | null = null;
  let nextIso: string | null = null;
  let nextLabel = "";
  let yearLinks: string[] = [];

  try {
    if (params.season == null) {
      season = await resolveOpenF1Season();
    }
    const [sess, seasons, calendar] = await Promise.all([
      getSessionsWithStatus(season),
      getSeasons().catch(() => [] as string[]),
      getSeasonCalendar(season).catch(() => []),
    ]);
    sessions = sess;
    yearLinks = (seasons.length ? seasons : [String(season)]).slice(0, 8);
    const next = findNextSession(calendar);
    if (next) {
      nextIso = next.slot.at;
      nextLabel = `${next.slot.label} · ${next.race.raceName}`;
    }
    const picked = await pickDefaultSession(season);
    if (picked) {
      initial = await getLiveSnapshot(picked.session_key);
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load live feed";
  }

  return (
    <div className="page-wrap space-y-10 py-12 sm:py-16">
      <PageHeader
        eyebrow="Timing board"
        title="Live"
        description="Session order while cars are on track — or the latest finished session when they are not."
      >
        <div className="space-y-3 pt-2">
          <SeasonSwitcher
            seasons={yearLinks}
            current={String(season)}
            makeHref={(s) => `/live?season=${s}`}
          />
          {nextIso ? (
            <SessionCountdown targetIso={nextIso} label={nextLabel} />
          ) : null}
        </div>
      </PageHeader>

      {loadError ? (
        <p className="border border-[var(--live)]/50 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--live)]">
          {loadError}. The board will keep trying — OpenF1 sometimes needs a
          short cool-down.
        </p>
      ) : (
        <LiveBoard initial={initial} sessions={sessions} season={season} />
      )}
    </div>
  );
}
