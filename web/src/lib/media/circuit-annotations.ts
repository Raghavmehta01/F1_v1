import { getTrackOutline } from "@/lib/media/track-outlines";

export type CircuitLandmark = {
  /** Short label shown on the map. */
  label: string;
  x: number;
  y: number;
};

export type NamedTurn = {
  n: number;
  /** Optional landmark name beside the number. */
  name?: string;
  x: number;
  y: number;
};

export type CircuitAnnotation = {
  lengthKm?: number;
  turns?: number;
  drsZones?: number;
  /** Approximate start/finish in viewBox coords. */
  startFinish?: { x: number; y: number };
  landmarks?: CircuitLandmark[];
  /** Curated turn pins — preferred over auto-detect when present. */
  namedTurns?: NamedTurn[];
};

/**
 * Hand-placed annotations for circuits where outlines alone look empty.
 * Coords are in the shared 0–100 track viewBox.
 */
const ANNOTATIONS: Record<string, CircuitAnnotation> = {
  vegas: {
    lengthKm: 6.201,
    turns: 17,
    drsZones: 2,
    startFinish: { x: 42, y: 94.5 },
    landmarks: [
      { label: "The Strip", x: 72, y: 58 },
      { label: "Sphere", x: 78, y: 28 },
      { label: "Koval", x: 28, y: 22 },
      { label: "Harmon", x: 40, y: 88 },
    ],
    namedTurns: [
      { n: 1, name: "Hairpin", x: 18, y: 78 },
      { n: 5, name: "Sphere entry", x: 82, y: 34 },
      { n: 8, x: 48, y: 8 },
      { n: 12, name: "Onto Strip", x: 78, y: 40 },
      { n: 14, name: "Strip end", x: 74, y: 82 },
      { n: 17, x: 22, y: 94 },
    ],
  },
  monaco: {
    lengthKm: 3.337,
    turns: 19,
    drsZones: 1,
    startFinish: { x: 58, y: 40 },
    landmarks: [
      { label: "Casino", x: 72, y: 18 },
      { label: "Harbour", x: 22, y: 70 },
      { label: "Rascasse", x: 18, y: 88 },
    ],
    namedTurns: [
      { n: 1, name: "Ste Devote", x: 70, y: 14 },
      { n: 6, name: "Casino", x: 88, y: 12 },
      { n: 8, name: "Mirabeau", x: 90, y: 28 },
      { n: 10, name: "Hairpin", x: 14, y: 58 },
      { n: 12, name: "Portier", x: 14, y: 72 },
      { n: 15, name: "Piscine", x: 24, y: 90 },
      { n: 18, name: "Rascasse", x: 18, y: 88 },
    ],
  },
  spa: {
    lengthKm: 7.004,
    turns: 19,
    drsZones: 2,
    startFinish: { x: 36, y: 12 },
    landmarks: [
      { label: "Eau Rouge", x: 44, y: 28 },
      { label: "Kemmel", x: 70, y: 40 },
      { label: "Bus Stop", x: 24, y: 84 },
    ],
    namedTurns: [
      { n: 1, name: "La Source", x: 28, y: 8 },
      { n: 3, name: "Eau Rouge", x: 42, y: 28 },
      { n: 4, name: "Raidillon", x: 48, y: 24 },
      { n: 7, name: "Les Combes", x: 90, y: 78 },
      { n: 15, name: "Stavelot", x: 52, y: 66 },
      { n: 19, name: "Bus Stop", x: 22, y: 86 },
    ],
  },
  silverstone: {
    lengthKm: 5.891,
    turns: 18,
    drsZones: 2,
    startFinish: { x: 48, y: 12 },
    landmarks: [
      { label: "Maggotts", x: 78, y: 28 },
      { label: "Becketts", x: 90, y: 48 },
      { label: "Hangar", x: 70, y: 70 },
    ],
    namedTurns: [
      { n: 1, name: "Abbey", x: 55, y: 8 },
      { n: 3, name: "Village", x: 78, y: 8 },
      { n: 6, name: "Luffield", x: 28, y: 18 },
      { n: 9, name: "Copse", x: 72, y: 44 },
      { n: 11, name: "Maggotts", x: 88, y: 42 },
      { n: 15, name: "Stowe", x: 48, y: 92 },
    ],
  },
  monza: {
    lengthKm: 5.793,
    turns: 11,
    drsZones: 2,
    startFinish: { x: 18, y: 50 },
    landmarks: [
      { label: "Rettifilo", x: 22, y: 40 },
      { label: "Ascari", x: 70, y: 18 },
      { label: "Parabolica", x: 22, y: 88 },
    ],
    namedTurns: [
      { n: 1, name: "Rettifilo", x: 20, y: 32 },
      { n: 4, name: "Roggia", x: 78, y: 8 },
      { n: 8, name: "Ascari", x: 72, y: 22 },
      { n: 11, name: "Parabolica", x: 24, y: 90 },
    ],
  },
  marina_bay: {
    lengthKm: 4.94,
    turns: 19,
    drsZones: 3,
    startFinish: { x: 88, y: 50 },
    landmarks: [{ label: "Anderson", x: 30, y: 70 }],
  },
  bahrain: {
    lengthKm: 5.412,
    turns: 15,
    drsZones: 3,
    startFinish: { x: 20, y: 30 },
  },
  jeddah: {
    lengthKm: 6.174,
    turns: 27,
    drsZones: 3,
    startFinish: { x: 52, y: 80 },
  },
  americas: {
    lengthKm: 5.513,
    turns: 20,
    drsZones: 2,
    startFinish: { x: 28, y: 66 },
    landmarks: [{ label: "Turn 1", x: 90, y: 32 }],
  },
  miami: {
    lengthKm: 5.412,
    turns: 19,
    drsZones: 3,
    startFinish: { x: 40, y: 40 },
  },
  suzuka: {
    lengthKm: 5.807,
    turns: 18,
    drsZones: 1,
    startFinish: { x: 78, y: 56 },
    landmarks: [
      { label: "S Curves", x: 55, y: 46 },
      { label: "130R", x: 18, y: 36 },
    ],
  },
  interlagos: {
    lengthKm: 4.309,
    turns: 15,
    drsZones: 2,
    startFinish: { x: 34, y: 92 },
    landmarks: [{ label: "Senna S", x: 34, y: 36 }],
  },
  catalunya: {
    lengthKm: 4.657,
    turns: 14,
    drsZones: 2,
    startFinish: { x: 78, y: 40 },
  },
  hungaroring: {
    lengthKm: 4.381,
    turns: 14,
    drsZones: 1,
    startFinish: { x: 30, y: 62 },
  },
  red_bull_ring: {
    lengthKm: 4.318,
    turns: 10,
    drsZones: 3,
    startFinish: { x: 55, y: 66 },
  },
  zandvoort: {
    lengthKm: 4.259,
    turns: 14,
    drsZones: 2,
    startFinish: { x: 22, y: 44 },
    landmarks: [{ label: "Banking", x: 88, y: 52 }],
  },
  yas_marina: {
    lengthKm: 5.281,
    turns: 16,
    drsZones: 2,
    startFinish: { x: 48, y: 58 },
  },
  losail: {
    lengthKm: 5.419,
    turns: 16,
    drsZones: 1,
    startFinish: { x: 24, y: 52 },
  },
  albert_park: {
    lengthKm: 5.278,
    turns: 14,
    drsZones: 2,
    startFinish: { x: 48, y: 78 },
  },
  imola: {
    lengthKm: 4.909,
    turns: 19,
    drsZones: 1,
    startFinish: { x: 70, y: 40 },
  },
  baku: {
    lengthKm: 6.003,
    turns: 20,
    drsZones: 2,
    startFinish: { x: 88, y: 34 },
  },
  shanghai: {
    lengthKm: 5.451,
    turns: 16,
    drsZones: 2,
    startFinish: { x: 24, y: 74 },
  },
  rodriguez: {
    lengthKm: 4.304,
    turns: 17,
    drsZones: 3,
    startFinish: { x: 18, y: 24 },
  },
};

const ALIASES: Record<string, string> = {
  las_vegas: "vegas",
};

export function getCircuitAnnotation(
  circuitId: string | null | undefined,
): CircuitAnnotation | null {
  if (!circuitId) return null;
  const id = ALIASES[circuitId] ?? circuitId;
  return ANNOTATIONS[id] ?? null;
}

/** Facts row even when only the outline exists. */
export function getCircuitMapMeta(circuitId: string | null | undefined) {
  const ann = getCircuitAnnotation(circuitId);
  const track = getTrackOutline(circuitId);
  return {
    name: track?.name ?? null,
    lengthKm: ann?.lengthKm ?? null,
    turns: ann?.turns ?? ann?.namedTurns?.length ?? null,
    drsZones: ann?.drsZones ?? null,
  };
}
