import { LiveBoard } from "@/components/LiveBoard";
import { PageHeader } from "@/components/PageHeader";
import {
  getLiveSnapshot,
  getSessionsWithStatus,
  pickDefaultSession,
} from "@/lib/openf1-live";
import { currentSeason } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const season = currentSeason();
  let initial = null;
  let sessions: Awaited<ReturnType<typeof getSessionsWithStatus>> = [];
  let loadError: string | null = null;

  try {
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
        description="Session leaderboard from OpenF1 — live when a session is on, replay when it is not."
      />

      {loadError ? (
        <p className="border border-[var(--brand)]/50 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--brand)]">
          {loadError}
        </p>
      ) : (
        <LiveBoard initial={initial} sessions={sessions} />
      )}
    </div>
  );
}
