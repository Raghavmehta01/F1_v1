import { describe, expect, it } from "vitest";
import { raceSessionSlots } from "@/lib/data/race-sessions";
import type { Race } from "@/lib/data/types";

const baseRace: Race = {
  season: "2026",
  round: "1",
  raceName: "Australian Grand Prix",
  date: "2026-03-15",
  time: "05:00:00Z",
  Circuit: {
    circuitId: "albert_park",
    circuitName: "Albert Park",
    Location: { locality: "Melbourne", country: "Australia" },
  },
  FirstPractice: { date: "2026-03-13", time: "01:30:00Z" },
  SecondPractice: { date: "2026-03-13", time: "05:00:00Z" },
  ThirdPractice: { date: "2026-03-14", time: "01:30:00Z" },
  Qualifying: { date: "2026-03-14", time: "05:00:00Z" },
};

describe("feature: race weekend session slots", () => {
  it("orders FP → quali → race for a standard weekend", () => {
    const slots = raceSessionSlots(baseRace);
    expect(slots.map((s) => s.id)).toEqual([
      "fp1",
      "fp2",
      "fp3",
      "qualifying",
      "race",
    ]);
    expect(slots[0]?.at).toBe("2026-03-13T01:30:00Z");
    expect(slots.at(-1)?.id).toBe("race");
  });

  it("includes sprint weekend sessions when present", () => {
    const sprintWeekend: Race = {
      ...baseRace,
      ThirdPractice: undefined,
      SprintQualifying: { date: "2026-03-14", time: "01:30:00Z" },
      Sprint: { date: "2026-03-14", time: "05:00:00Z" },
    };
    const ids = raceSessionSlots(sprintWeekend).map((s) => s.id);
    expect(ids).toContain("sprint_qualifying");
    expect(ids).toContain("sprint");
    expect(ids).not.toContain("fp3");
  });

  it("returns empty when race has no schedule fields", () => {
    const empty: Race = {
      ...baseRace,
      date: "",
      FirstPractice: undefined,
      SecondPractice: undefined,
      ThirdPractice: undefined,
      Qualifying: undefined,
    };
    expect(raceSessionSlots(empty)).toEqual([]);
  });
});
