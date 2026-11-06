const SEASON_MIN = 1950;
const SEASON_MAX = 2100;

export function parseSeason(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < SEASON_MIN || n > SEASON_MAX) return null;
  return n;
}

export function parseRound(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1 || n > 30) return null;
  return n;
}

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export function parseId(value: string | null | undefined): string | null {
  if (!value || !ID_RE.test(value)) return null;
  return value;
}

export function currentSeason(): number {
  return new Date().getUTCFullYear();
}
