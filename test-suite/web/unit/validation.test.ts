import { describe, expect, it } from "vitest";
import {
  currentSeason,
  parseId,
  parseRound,
  parseSeason,
} from "@/lib/security/validation";

describe("feature: season / round / id validation", () => {
  it("parses valid seasons", () => {
    expect(parseSeason("2026")).toBe(2026);
    expect(parseSeason("1950")).toBe(1950);
  });

  it("rejects out-of-range or garbage seasons", () => {
    expect(parseSeason("1949")).toBeNull();
    expect(parseSeason("2101")).toBeNull();
    expect(parseSeason("abc")).toBeNull();
    expect(parseSeason("")).toBeNull();
    expect(parseSeason(null)).toBeNull();
  });

  it("parses valid rounds 1–30", () => {
    expect(parseRound("1")).toBe(1);
    expect(parseRound("30")).toBe(30);
  });

  it("rejects invalid rounds", () => {
    expect(parseRound("0")).toBeNull();
    expect(parseRound("31")).toBeNull();
    expect(parseRound("x")).toBeNull();
  });

  it("parses safe ids", () => {
    expect(parseId("max_verstappen")).toBe("max_verstappen");
    expect(parseId("red_bull")).toBe("red_bull");
  });

  it("rejects unsafe ids", () => {
    expect(parseId("../etc")).toBeNull();
    expect(parseId("a/b")).toBeNull();
    expect(parseId("")).toBeNull();
  });

  it("currentSeason returns a plausible year", () => {
    const y = currentSeason();
    expect(y).toBeGreaterThanOrEqual(2020);
    expect(y).toBeLessThanOrEqual(2100);
  });
});
