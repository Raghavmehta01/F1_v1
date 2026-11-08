import { describe, expect, it } from "vitest";
import {
  buildRows,
  inferQualiSegment,
  resolveTimingMode,
  sessionKind,
  sessionPriority,
  sessionStatus,
} from "@/lib/data/openf1-live";
import type { OpenF1Session } from "@/lib/data/openf1-live";
import type { OpenF1Driver } from "@/lib/data/openf1";

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

function driver(
  n: number,
  name: string,
  acronym: string,
): OpenF1Driver {
  return {
    driver_number: n,
    full_name: name,
    name_acronym: acronym,
    team_name: "Test",
    team_colour: "ffffff",
    headshot_url: null,
    first_name: name.split(" ")[0] ?? name,
    last_name: name.split(" ").slice(1).join(" ") || name,
    broadcast_name: name,
    country_code: "GBR",
    session_key: 1,
    meeting_key: 1,
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

describe("feature: live ranking by session rules", () => {
  it("classifies session kinds", () => {
    expect(
      sessionKind(
        session({
          session_name: "Race",
          session_type: "Race",
          date_start: "2026-01-01T00:00:00Z",
          date_end: "2026-01-01T02:00:00Z",
        }),
      ),
    ).toBe("race");
    expect(
      sessionKind(
        session({
          session_name: "Sprint",
          session_type: "Race",
          date_start: "2026-01-01T00:00:00Z",
          date_end: "2026-01-01T01:00:00Z",
        }),
      ),
    ).toBe("sprint");
    expect(
      sessionKind(
        session({
          session_name: "Qualifying",
          session_type: "Qualifying",
          date_start: "2026-01-01T00:00:00Z",
          date_end: "2026-01-01T01:00:00Z",
        }),
      ),
    ).toBe("qualifying");
    expect(
      sessionKind(
        session({
          session_name: "Sprint Qualifying",
          session_type: "Qualifying",
          date_start: "2026-01-01T00:00:00Z",
          date_end: "2026-01-01T01:00:00Z",
        }),
      ),
    ).toBe("qualifying");
    expect(
      sessionKind(
        session({
          session_name: "Practice 1",
          session_type: "Practice",
          date_start: "2026-01-01T00:00:00Z",
          date_end: "2026-01-01T01:00:00Z",
        }),
      ),
    ).toBe("practice");
  });

  it("resolves timing mode per session rules", () => {
    const quali = session({
      session_name: "Qualifying",
      session_type: "Qualifying",
      date_start: "2026-01-01T00:00:00Z",
      date_end: "2026-01-01T01:00:00Z",
    });
    const race = session({
      session_name: "Race",
      session_type: "Race",
      date_start: "2026-01-01T00:00:00Z",
      date_end: "2026-01-01T02:00:00Z",
    });
    const fp = session({
      session_name: "Practice 2",
      session_type: "Practice",
      date_start: "2026-01-01T00:00:00Z",
      date_end: "2026-01-01T01:00:00Z",
    });
    expect(resolveTimingMode(quali, false)).toBe("classification");
    expect(resolveTimingMode(race, true)).toBe("race");
    expect(resolveTimingMode(race, false)).toBe("classification");
    expect(resolveTimingMode(fp, false)).toBe("laps");
  });

  it("ranks qualifying by official position, not absolute best lap", () => {
    const drivers = [
      driver(4, "Lando Norris", "NOR"),
      driver(63, "George Russell", "RUS"),
    ];
    const positions = [
      { date: "2026-11-07T18:00:00Z", driver_number: 4, position: 1 },
      { date: "2026-11-07T18:00:00Z", driver_number: 63, position: 2 },
    ];
    const laps = [
      {
        driver_number: 63,
        lap_number: 5,
        lap_duration: 86.745,
        is_pit_out_lap: false,
        date_start: "2026-11-07T17:40:00Z",
      },
      {
        driver_number: 4,
        lap_number: 8,
        lap_duration: 87.47,
        is_pit_out_lap: false,
        date_start: "2026-11-07T17:50:00Z",
      },
    ];

    const byLaps = buildRows(drivers, positions, [], laps, "laps");
    expect(byLaps[0]?.name_acronym).toBe("RUS");

    const byClass = buildRows(drivers, positions, [], laps, "classification");
    expect(byClass[0]?.name_acronym).toBe("NOR");
    expect(byClass[1]?.name_acronym).toBe("RUS");
    expect(byClass[0]?.position).toBe(1);
  });

  it("infers Q1 / Q2 / Q3 / Final from race_control without hardcoding", () => {
    const rc = [
      {
        date: "2026-11-07T16:00:00Z",
        category: "SessionStatus",
        message: "SESSION STARTED",
        qualifying_phase: 1,
      },
      {
        date: "2026-11-07T16:18:00Z",
        category: "Flag",
        message: "CHEQUERED FLAG",
        qualifying_phase: 1,
      },
      {
        date: "2026-11-07T16:18:01Z",
        category: "SessionStatus",
        message: "SESSION FINISHED",
        qualifying_phase: 1,
      },
      {
        date: "2026-11-07T16:25:00Z",
        category: "SessionStatus",
        message: "SESSION STARTED",
        qualifying_phase: 2,
      },
      {
        date: "2026-11-07T16:40:00Z",
        category: "SessionStatus",
        message: "SESSION FINISHED",
        qualifying_phase: 2,
      },
      {
        date: "2026-11-07T16:48:00Z",
        category: "SessionStatus",
        message: "SESSION STARTED",
        qualifying_phase: 3,
      },
      {
        date: "2026-11-07T17:00:00Z",
        category: "SessionStatus",
        message: "SESSION FINISHED",
        qualifying_phase: 3,
      },
    ];

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "live",
        sprintQuali: false,
        nowMs: Date.parse("2026-11-07T16:10:00Z"),
      }).segment,
    ).toBe("Q1");

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "live",
        sprintQuali: false,
        nowMs: Date.parse("2026-11-07T16:30:00Z"),
      }).segment,
    ).toBe("Q2");

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "live",
        sprintQuali: false,
        nowMs: Date.parse("2026-11-07T16:50:00Z"),
      }).segment,
    ).toBe("Q3");

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "live",
        sprintQuali: false,
        nowMs: Date.parse("2026-11-07T17:05:00Z"),
      }).segment,
    ).toBe("Final");

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "replay",
        sprintQuali: false,
        nowMs: Date.parse("2026-11-08T12:00:00Z"),
      }).segment,
    ).toBe("Final");

    expect(
      inferQualiSegment(rc, {
        sessionStatus: "live",
        sprintQuali: true,
        nowMs: Date.parse("2026-11-07T16:10:00Z"),
      }).segment,
    ).toBe("SQ1");
  });
});
