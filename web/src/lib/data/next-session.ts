import type { Race } from "@/lib/data/types";
import { raceSessionSlots, type RaceSessionSlot } from "@/lib/data/race-sessions";

export type NextSessionTarget = {
  race: Race;
  slot: RaceSessionSlot;
  atMs: number;
};

/** Next upcoming weekend session across the season calendar. */
export function findNextSession(
  races: Race[],
  nowMs = Date.now(),
): NextSessionTarget | null {
  let best: NextSessionTarget | null = null;
  for (const race of races) {
    for (const slot of raceSessionSlots(race)) {
      const atMs = Date.parse(slot.at);
      if (!Number.isFinite(atMs) || atMs <= nowMs) continue;
      if (!best || atMs < best.atMs) best = { race, slot, atMs };
    }
  }
  return best;
}

export function weekendBlurb(race: Race): string {
  const hasSprint = Boolean(race.Sprint || race.SprintQualifying || race.SprintShootout);
  const circuit = race.Circuit.circuitName;
  const locality = race.Circuit.Location.locality;
  if (hasSprint) {
    return `Sprint weekend at ${circuit} (${locality}) — quali, sprint, then the Grand Prix.`;
  }
  return `Standard weekend at ${circuit} (${locality}) — practice, qualifying, race.`;
}
