/** Cache TTLs in seconds for Next.js fetch revalidate. Keep current data tight. */
export const CACHE_TTL = {
  seasons: 60 * 60 * 12,
  circuits: 60 * 60 * 12,
  calendar: 60 * 2,
  standings: 60,
  raceResult: 60 * 2,
  media: 60 * 5,
  live: 3,
} as const;
