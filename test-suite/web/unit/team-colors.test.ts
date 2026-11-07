import { describe, expect, it } from "vitest";
import {
  teamColor,
  teamContrast,
  teamStageFill,
  teamStageInk,
} from "@/lib/media/team-colors";

describe("feature: team stage colors", () => {
  it("returns known constructor accents", () => {
    expect(teamColor("ferrari")).toBe("#C4001A");
    expect(teamColor("mercedes")).toBe("#00A89A");
    expect(teamStageFill("mclaren")).toBe(teamColor("mclaren"));
  });

  it("falls back for unknown / missing ids", () => {
    expect(teamColor(undefined)).toBe("#5C6670");
    expect(teamColor("not_a_team")).toBe("#5C6670");
  });

  it("keeps stage ink light for contrast", () => {
    expect(teamStageInk("ferrari")).toBe("#F7F5F2");
  });

  it("returns high-contrast chip colors", () => {
    expect(teamContrast("red_bull")).toBe("#F4E804");
    expect(teamContrast(undefined)).toBe("#F7F5F2");
  });
});
