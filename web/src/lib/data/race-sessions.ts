import type { Race, RaceSession } from "@/lib/data/types";

export type RaceSessionSlot = {
  id: string;
  label: string;
  /** ISO-8601 UTC instant */
  at: string;
};

function toIso(slot: RaceSession): string | null {
  if (!slot.date) return null;
  if (!slot.time) return `${slot.date}T12:00:00Z`;
  const t = slot.time.endsWith("Z") ? slot.time : `${slot.time}Z`;
  return `${slot.date}T${t}`;
}

/** Ordered weekend sessions from a Jolpica race payload. */
export function raceSessionSlots(race: Race): RaceSessionSlot[] {
  const candidates: Array<[string, string, RaceSession | undefined]> = [
    ["fp1", "FP1", race.FirstPractice],
    ["fp2", "FP2", race.SecondPractice],
    ["fp3", "FP3", race.ThirdPractice],
    ["sprint_qualifying", "Sprint quali", race.SprintQualifying ?? race.SprintShootout],
    ["sprint", "Sprint", race.Sprint],
    ["qualifying", "Qualifying", race.Qualifying],
    [
      "race",
      "Race",
      race.date
        ? { date: race.date, time: race.time ?? "12:00:00Z" }
        : undefined,
    ],
  ];

  const out: RaceSessionSlot[] = [];
  for (const [id, label, slot] of candidates) {
    if (!slot) continue;
    const at = toIso(slot);
    if (!at) continue;
    out.push({ id, label, at });
  }
  return out;
}
