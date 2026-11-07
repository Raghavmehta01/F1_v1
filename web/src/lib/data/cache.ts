/** Cache TTLs in seconds for Next.js fetch revalidate / process memory caches. */
export const CACHE_TTL = {
  seasons: 60 * 60 * 12,
  seasonsStale: 60 * 60 * 48,
  circuits: 60 * 60 * 12,
  circuitsStale: 60 * 60 * 48,
  /** Season calendar — stable between weekends */
  calendar: 60 * 5,
  calendarStale: 60 * 60,
  /** Standings */
  standings: 60 * 2,
  standingsStale: 60 * 20,
  raceResult: 60 * 3,
  raceResultStale: 60 * 30,
  /** OpenF1 driver headshots index */
  media: 60 * 15,
  mediaStale: 60 * 60,
  /** Official F1.com RSS */
  news: 60 * 10,
  newsStale: 60 * 60,
  /** OpenF1 session calendar */
  sessions: 60 * 10,
  sessionsStale: 60 * 60,
  /** Live timing board */
  liveTiming: 8,
  liveTimingStale: 60,
  /** Finished session boards / practice laps */
  replayTiming: 60 * 3,
  replayTimingStale: 60 * 45,
  /** @deprecated use liveTiming */
  live: 8,
} as const;
