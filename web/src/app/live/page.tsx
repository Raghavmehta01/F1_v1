import { LiveBoard } from "@/components/live/LiveBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getLiveSnapshot,
  getSessionsWithStatus,
  pickDefaultSession,
  resolveOpenF1Season,
} from "@/lib/data/openf1-live";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  let initial = null;
  let sessions: Awaited<ReturnType<typeof getSessionsWithStatus>> = [];
  let season = new Date().getUTCFullYear();
  let loadError: string | null = null;

  try {
    season = await resolveOpenF1Season();
    sessions = await getSessionsWithStatus(season);
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
      />

      {loadError ? (
        <p className="border border-[var(--brand)]/50 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--brand)]">
          {loadError}
        </p>
      ) : (
        <LiveBoard initial={initial} sessions={sessions} season={season} />
      )}
    </div>
  );
}
