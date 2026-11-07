import { describe, expect, it } from "vitest";
import { sessionPriority, sessionStatus } from "@/lib/data/openf1-live";
import type { OpenF1Session } from "@/lib/data/openf1-live";

function session(
  partial: Partial<OpenF1Session> &
    Pick<OpenF1Session, "session_name" | "session_type" | "date_start" | "date_end">,
): OpenF1Session {
  return {
    session_key: 1,
    meeting_key: 1,
    is_cancelled: false,
    session_name: partial.session_name,
    session_type: partial.session_type,
    date_start: partial.date_start,
    date_end: partial.date_end,
    circuit_short_name: partial.circuit_short_name ?? "Melbourne",
    country_name: partial.country_name ?? "Australia",
    location: partial.location ?? "Albert Park",
    year: partial.year ?? 2026,
  };
}

describe("feature: live session picker helpers", () => {
  it("marks upcoming / live / replay from the ±20 min window", () => {
    const s = session({
      session_name: "Race",
      session_type: "Race",
      date_start: "2026-03-15T12:00:00Z",
      date_end: "2026-03-15T14:00:00Z",
    });
    expect(sessionStatus(s, Date.parse("2026-03-15T11:30:00Z"))).toBe(
      "upcoming",
    );
    expect(sessionStatus(s, Date.parse("2026-03-15T11:45:00Z"))).toBe("live");
    expect(sessionStatus(s, Date.parse("2026-03-15T13:00:00Z"))).toBe("live");
    expect(sessionStatus(s, Date.parse("2026-03-15T14:30:00Z"))).toBe("replay");
  });

  it("prioritizes race over sprint over quali over practice", () => {
    const race = sessionPriority(
      session({
        session_name: "Race",
        session_type: "Race",
        date_start: "2026-01-01T00:00:00Z",
        date_end: "2026-01-01T02:00:00Z",
      }),
    );
    const sprint = sessionPriority(
      session({
        session_name: "Sprint",
        session_type: "Race",
        date_start: "2026-01-01T00:00:00Z",
        date_end: "2026-01-01T01:00:00Z",
      }),
    );
    const quali = sessionPriority(
      session({
        session_name: "Qualifying",
        session_type: "Qualifying",
        date_start: "2026-01-01T00:00:00Z",
        date_end: "2026-01-01T01:00:00Z",
      }),
    );
    const fp = sessionPriority(
      session({
        session_name: "Practice 1",
        session_type: "Practice",
        date_start: "2026-01-01T00:00:00Z",
        date_end: "2026-01-01T01:00:00Z",
      }),
    );
    expect(race).toBeLessThan(sprint);
    expect(sprint).toBeLessThan(quali);
    expect(quali).toBeLessThan(fp);
  });
});
