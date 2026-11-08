/** Constructor accent / stage fill colors (data, not chrome theme). */
const COLORS: Record<string, string> = {
  mercedes: "#00A89A",
  red_bull: "#1E5BB8",
  ferrari: "#C4001A",
  mclaren: "#E06C00",
  alpine: "#D45A9A",
  rb: "#4A74E0",
  visa_rb: "#4A74E0",
  sauber: "#2E9E2E",
  kick_sauber: "#2E9E2E",
  audi: "#D0042F",
  aston_martin: "#1A7A58",
  williams: "#2A8FCB",
  haas: "#6E7276",
  cadillac: "#1A1C1E",
};

/** Always light ink on stages — white type + white logos stay sharp. */
const STAGE_INK = "#F7F5F2";

export function teamColor(constructorId: string | undefined): string {
  if (!constructorId) return "#5C6670";
  return COLORS[constructorId] ?? "#5C6670";
}

/** Stage type is always light ink. */
export function teamStageInk(_constructorId?: string): string {
  return STAGE_INK;
}

export function teamStageFill(constructorId: string | undefined): string {
  return teamColor(constructorId);
}

/** High-contrast accent for mirror chips on team stages. */
const CONTRAST: Record<string, string> = {
  mercedes: "#041012",
  red_bull: "#F4E804",
  ferrari: "#FFF5F0",
  mclaren: "#101114",
  alpine: "#FFFFFF",
  rb: "#FFFFFF",
  visa_rb: "#FFFFFF",
  sauber: "#041208",
  kick_sauber: "#041208",
  audi: "#FFFFFF",
  aston_martin: "#C5FF3C",
  williams: "#101114",
  haas: "#E10600",
  cadillac: "#B4A26A",
};

export function teamContrast(constructorId: string | undefined): string {
  if (!constructorId) return "#F7F5F2";
  return CONTRAST[constructorId] ?? "#F7F5F2";
}
