// Pure calculation helpers for the /api/stats endpoint. Kept free of Next.js
// request/response types and Supabase access so they can be unit tested
// directly against plain inputs.

export interface ProfileRow {
  email: string
  full_name: string | null
  designation: string | null
  years_of_experience: string | null
  country: string | null
  state_region: string | null
  city: string | null
}

export interface ScoreEntry {
  email: string
  score: number
  time_taken_seconds: number
  completed_at: string
  profile: ProfileRow
}

export interface ResultRow {
  user_email: string
  score: number
  time_taken_seconds: number
  completed_at: string
}

// Minimum number of distinct users a segment/breakdown must contain before we're
// willing to report it back to the client. Narrow filters (e.g. a rare
// designation in a small city) can otherwise de-anonymize one or two real
// people. Any group row (distribution bucket, average-by-group bucket, or
// location comparison) that falls below this is dropped rather than returned.
export const MIN_COHORT_SIZE = 1

export function toDistribution(
  entries: ScoreEntry[],
  getLabel: (entry: ScoreEntry) => string | null | undefined
) {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const label = getLabel(entry)?.trim() || 'Unknown'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percent: entries.length > 0 ? Math.round((count / entries.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// Same grouping as toDistribution, but reports the group's average score instead
// of its share of the crowd — answers "how well do people in each group score"
// rather than "how many people are in each group".
export function toAverageScoreByGroup(
  entries: ScoreEntry[],
  getLabel: (entry: ScoreEntry) => string | null | undefined
) {
  const groups = new Map<string, { sum: number; count: number }>()
  for (const entry of entries) {
    const label = getLabel(entry)?.trim() || 'Unknown'
    const group = groups.get(label) ?? { sum: 0, count: 0 }
    group.sum += entry.score
    group.count += 1
    groups.set(label, group)
  }

  return [...groups.entries()]
    .map(([label, { sum, count }]) => ({
      label,
      count,
      averageScore: Math.round((sum / count) * 10) / 10,
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.count - a.count)
}

export function roundToOne(value: number) {
  return Math.round(value * 10) / 10
}

export function averageScoreFor(entries: ScoreEntry[]) {
  if (entries.length === 0) return null
  return roundToOne(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
}

export function averageTimeFor(entries: ScoreEntry[]) {
  if (entries.length === 0) return null
  return Math.round(
    entries.reduce((sum, entry) => sum + entry.time_taken_seconds, 0) / entries.length
  )
}

// Already-parsed location query params, resolved by the caller (the route
// handler owns reading them off the request) so this stays a pure function.
export interface LocationParams {
  country: string | null
  stateRegion: string | null
  city: string | null
}

export function buildLocationComparisons(locationParams: LocationParams, entries: ScoreEntry[]) {
  const { country, stateRegion, city } = locationParams

  const comparisons: Array<{ label: string; scope: string; averageScore: number | null; count: number }> = []

  function addComparison(label: string | null, scope: string, matches: (entry: ScoreEntry) => boolean) {
    if (!label || label === 'all') return
    const scopedEntries = entries.filter(matches)
    // Skip segments too small to report without risking de-anonymization.
    if (scopedEntries.length < MIN_COHORT_SIZE) return
    comparisons.push({
      label,
      scope,
      averageScore: averageScoreFor(scopedEntries),
      count: scopedEntries.length,
    })
  }

  addComparison(city, 'City', (entry) => entry.profile.city === city)
  addComparison(stateRegion, 'State / Region', (entry) => entry.profile.state_region === stateRegion)
  addComparison(country, 'Country', (entry) => entry.profile.country === country)

  // The "Global" row reflects the same filtered cohort used for the rest of
  // this response, so guard it on the same size floor for consistency.
  if (entries.length >= MIN_COHORT_SIZE) {
    comparisons.push({
      label: 'Global',
      scope: 'Global',
      averageScore: averageScoreFor(entries),
      count: entries.length,
    })
  }

  return comparisons
}

export interface NeighborRow {
  rank: number
  score: number
  isYou: boolean
  name: string
}

// Window of ranks immediately above and below the user, with display names
// (same idea as the public leaderboard). Email is never returned.
export function buildNeighbors(entries: ScoreEntry[], yourEmail: string, windowSize = 2): NeighborRow[] {
  if (entries.length < MIN_COHORT_SIZE) return []

  const yourEntry = entries.find((entry) => entry.email === yourEmail)
  if (!yourEntry) return []

  const sorted = [...entries].sort((a, b) => b.score - a.score || a.email.localeCompare(b.email))

  let rank = 0
  let previousScore: number | null = null
  const ranked = sorted.map((entry) => {
    if (entry.score !== previousScore) {
      rank = sorted.filter((e) => e.score > entry.score).length + 1
      previousScore = entry.score
    }
    const name = entry.profile.full_name?.trim() || 'Anonymous'
    return {
      rank,
      score: entry.score,
      isYou: entry.email === yourEmail,
      name,
    }
  })

  const yourIndex = ranked.findIndex((row) => row.isYou)
  const start = Math.max(0, yourIndex - windowSize)
  const end = Math.min(ranked.length, yourIndex + windowSize + 1)
  return ranked.slice(start, end)
}

export function buildUserProgress(userAttempts: ResultRow[]) {
  const latest = userAttempts[0] ?? null
  const previous = userAttempts[1] ?? null
  const scores = userAttempts.map((attempt) => attempt.score)
  const averageScore = scores.length > 0
    ? roundToOne(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null
  const bestScore = scores.length > 0 ? Math.max(...scores) : null
  const scoreRange = scores.length > 0 ? Math.max(...scores) - Math.min(...scores) : null
  const standardDeviation =
    scores.length > 1 && averageScore !== null
      ? roundToOne(
          Math.sqrt(
            scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) /
              scores.length
          )
        )
      : null

  const consistencyLabel =
    scores.length < 2
      ? 'Need 2 attempts'
      : standardDeviation !== null && standardDeviation <= 1
        ? 'Stable'
        : standardDeviation !== null && standardDeviation <= 2
          ? 'Mixed'
          : 'Volatile'

  return {
    attemptCount: userAttempts.length,
    latestScore: latest?.score ?? null,
    previousScore: previous?.score ?? null,
    scoreChange: latest && previous ? latest.score - previous.score : null,
    bestScore,
    latestTimeSeconds: latest?.time_taken_seconds ?? null,
    averageTimePerQuestionSeconds: latest ? roundToOne(latest.time_taken_seconds / 10) : null,
    scorePerMinute:
      latest && latest.time_taken_seconds > 0
        ? roundToOne(latest.score / (latest.time_taken_seconds / 60))
        : null,
    latestCompletedAt: latest?.completed_at ?? null,
    consistency: {
      label: consistencyLabel,
      averageScore,
      scoreRange,
      standardDeviation,
    },
  }
}

export interface DayActivity {
  date: string
  count: number
}

// Buckets a user's attempts by calendar day (UTC), for an activity-calendar
// heatmap. completed_at is an ISO timestamp; only the date portion matters.
export function buildActivityCalendar(userAttempts: ResultRow[]): DayActivity[] {
  const counts = new Map<string, number>()
  for (const attempt of userAttempts) {
    const date = attempt.completed_at.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
}

// today defaults to now but is injectable so tests aren't wall-clock dependent.
export function buildStreaks(userAttempts: ResultRow[], today: Date = new Date()): StreakInfo {
  const days = new Set(userAttempts.map((attempt) => attempt.completed_at.slice(0, 10)))
  if (days.size === 0) return { currentStreak: 0, longestStreak: 0 }

  const sortedDays = [...days].sort()

  let longestStreak = 1
  let run = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(`${sortedDays[i - 1]}T00:00:00Z`)
    const curr = new Date(`${sortedDays[i]}T00:00:00Z`)
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    run = diffDays === 1 ? run + 1 : 1
    longestStreak = Math.max(longestStreak, run)
  }

  // A streak survives if today is already logged, or if today isn't over yet
  // but yesterday is logged (so the user hasn't broken the chain, just hasn't
  // played today). It doesn't survive if the most recent attempt was before
  // yesterday.
  const todayStr = today.toISOString().slice(0, 10)
  const yesterdayDate = new Date(today)
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

  let currentStreak = 0
  if (days.has(todayStr) || days.has(yesterdayStr)) {
    let cursor = days.has(todayStr) ? todayStr : yesterdayStr
    while (days.has(cursor)) {
      currentStreak += 1
      const cursorDate = new Date(`${cursor}T00:00:00Z`)
      cursorDate.setUTCDate(cursorDate.getUTCDate() - 1)
      cursor = cursorDate.toISOString().slice(0, 10)
    }
  }

  return { currentStreak, longestStreak }
}

export interface TimeOfDayBucket {
  dayOfWeek: number
  hour: number
  averageScore: number
  count: number
}

// Groups attempts by (day of week, hour) so the UI can answer "when do I
// actually test best" instead of just "when do I test most".
export function buildTimeOfDayPerformance(userAttempts: ResultRow[]): TimeOfDayBucket[] {
  const groups = new Map<string, { sum: number; count: number; dayOfWeek: number; hour: number }>()
  for (const attempt of userAttempts) {
    const completedAt = new Date(attempt.completed_at)
    const dayOfWeek = completedAt.getUTCDay()
    const hour = completedAt.getUTCHours()
    const key = `${dayOfWeek}-${hour}`
    const group = groups.get(key) ?? { sum: 0, count: 0, dayOfWeek, hour }
    group.sum += attempt.score
    group.count += 1
    groups.set(key, group)
  }

  return [...groups.values()]
    .map(({ sum, count, dayOfWeek, hour }) => ({
      dayOfWeek,
      hour,
      count,
      averageScore: roundToOne(sum / count),
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.hour - b.hour)
}

export interface PacePoint {
  timeTakenSeconds: number
  score: number
  completedAt: string
}

// Raw (time, score) pairs for a pace-vs-accuracy scatter plot, newest last.
export function buildPacePoints(userAttempts: ResultRow[]): PacePoint[] {
  return [...userAttempts]
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
    .map((attempt) => ({
      timeTakenSeconds: attempt.time_taken_seconds,
      score: attempt.score,
      completedAt: attempt.completed_at,
    }))
}

export interface DomainResultRow extends ResultRow {
  domain: string
}

export interface DomainRange {
  domain: string
  min: number
  mean: number
  max: number
  count: number
}

// Per-domain min/mean/max, used by the "pace vs. accuracy" and domain-spread
// widgets to show a user's range rather than just a single average.
export function buildDomainRanges(userAttempts: DomainResultRow[]): DomainRange[] {
  const groups = new Map<string, number[]>()
  for (const attempt of userAttempts) {
    const scores = groups.get(attempt.domain) ?? []
    scores.push(attempt.score)
    groups.set(attempt.domain, scores)
  }

  return [...groups.entries()]
    .map(([domain, scores]) => ({
      domain,
      min: Math.min(...scores),
      max: Math.max(...scores),
      mean: roundToOne(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.mean - a.mean)
}

export interface CohortRank {
  rank: number | null
  percentile: number | null
  cohortSize: number
  averageScore: number | null
}

// Standard competition ranking (1224-style: ties share a rank, the next rank
// skips) plus a self-excluded percentile — mirrors the yourRank/percentile
// logic in /api/stats, extracted so the Rank Ladder and Peer Groups widgets
// can reuse it across multiple scopes at once. Returns nulls when the user
// isn't part of the cohort, or the cohort is too small to report without
// risking de-anonymization. averageScore is a crowd stat, not a personal one,
// so it's withheld purely on cohort size — it doesn't require the user to
// belong to the cohort (e.g. a Rank Ladder rung for a location you've
// filtered to but don't personally live in).
export function rankWithinCohort(
  userScore: number | null,
  cohortScores: number[],
  userIsInCohort: boolean
): CohortRank {
  const cohortSize = cohortScores.length
  const averageScore =
    cohortSize >= MIN_COHORT_SIZE
      ? roundToOne(cohortScores.reduce((sum, score) => sum + score, 0) / cohortSize)
      : null

  if (userScore === null || !userIsInCohort || cohortSize < MIN_COHORT_SIZE) {
    return { rank: null, percentile: null, cohortSize, averageScore }
  }

  const rank = cohortScores.filter((score) => score > userScore).length + 1

  const peerCount = cohortSize - 1
  const percentile =
    peerCount > 0
      ? Math.round((cohortScores.filter((score) => score < userScore).length / peerCount) * 100)
      : null

  return { rank, percentile, cohortSize, averageScore }
}

export interface ScopeRank extends CohortRank {
  scope: string
  label: string
}

// The Rank Ladder widget: the user's rank/percentile at every geographic
// scope simultaneously (City, State/Region, Country, Global), so switching
// scopes doesn't require a re-fetch. Rungs for a scope the user hasn't set
// (or filtered to "all") are omitted rather than shown as a meaningless
// "You rank #1 of 1".
export function buildRankLadder(
  locationParams: LocationParams,
  entries: ScoreEntry[],
  userEmail: string
): ScopeRank[] {
  const userEntry = entries.find((entry) => entry.email === userEmail)
  const userScore = userEntry?.score ?? null
  const { country, stateRegion, city } = locationParams

  const rungs: Array<{ label: string; scope: string; matches: (entry: ScoreEntry) => boolean }> = []
  if (city && city !== 'all') {
    rungs.push({ label: city, scope: 'City', matches: (entry) => entry.profile.city === city })
  }
  if (stateRegion && stateRegion !== 'all') {
    rungs.push({
      label: stateRegion,
      scope: 'State / Region',
      matches: (entry) => entry.profile.state_region === stateRegion,
    })
  }
  if (country && country !== 'all') {
    rungs.push({ label: country, scope: 'Country', matches: (entry) => entry.profile.country === country })
  }
  rungs.push({ label: 'Global', scope: 'Global', matches: () => true })

  return rungs.map(({ label, scope, matches }) => {
    const cohort = entries.filter(matches)
    const cohortScores = cohort.map((entry) => entry.score)
    const userIsInCohort = cohort.some((entry) => entry.email === userEmail)
    return { scope, label, ...rankWithinCohort(userScore, cohortScores, userIsInCohort) }
  })
}

export interface PeerGroupRank extends CohortRank {
  dimension: string
  label: string | null
}

export interface PeerGroupDimension {
  dimension: string
  getLabel: (entry: ScoreEntry) => string | null | undefined
}

// The Peer Groups table's "Your rank" column: rank-within-cohort across
// several dimensions (role, experience, city, state, country) at once. Uses
// the same "Unknown" fallback as toDistribution/toAverageScoreByGroup so a
// user's rank among peers with a blank profile field still resolves.
export function buildPeerGroupRanks(
  entries: ScoreEntry[],
  userEmail: string,
  dimensions: PeerGroupDimension[]
): PeerGroupRank[] {
  const userEntry = entries.find((entry) => entry.email === userEmail)
  const userScore = userEntry?.score ?? null

  return dimensions.map(({ dimension, getLabel }) => {
    const userLabel = userEntry ? getLabel(userEntry)?.trim() || 'Unknown' : null
    if (userLabel === null) {
      return { dimension, label: null, rank: null, percentile: null, cohortSize: 0, averageScore: null }
    }

    const cohort = entries.filter((entry) => (getLabel(entry)?.trim() || 'Unknown') === userLabel)
    const cohortScores = cohort.map((entry) => entry.score)
    const userIsInCohort = cohort.some((entry) => entry.email === userEmail)
    return {
      dimension,
      label: userLabel,
      ...rankWithinCohort(userScore, cohortScores, userIsInCohort),
    }
  })
}

export interface DomainScoreEntry extends ScoreEntry {
  domain: string
}

export interface DomainRadarPoint {
  domain: string
  you: number | null
  city: number | null
  country: number | null
}

// The Domain Radar widget: per-domain average score for you, your city, and
// your country side by side, across every domain (not just the one the rest
// of the page is filtered to). City/country points are withheld below
// MIN_COHORT_SIZE, same as every other crowd comparison.
export function buildDomainRadar(
  entries: DomainScoreEntry[],
  userEmail: string,
  locationParams: Pick<LocationParams, 'city' | 'country'>,
  domains: string[]
): DomainRadarPoint[] {
  const { city, country } = locationParams

  return domains.map((domain) => {
    const domainEntries = entries.filter((entry) => entry.domain === domain)
    const userEntry = domainEntries.find((entry) => entry.email === userEmail)

    const cityEntries =
      city && city !== 'all' ? domainEntries.filter((entry) => entry.profile.city === city) : []
    const countryEntries =
      country && country !== 'all'
        ? domainEntries.filter((entry) => entry.profile.country === country)
        : []

    return {
      domain,
      you: userEntry?.score ?? null,
      city: cityEntries.length >= MIN_COHORT_SIZE ? averageScoreFor(cityEntries) : null,
      country: countryEntries.length >= MIN_COHORT_SIZE ? averageScoreFor(countryEntries) : null,
    }
  })
}

export interface RankedGroup {
  label: string
  count: number
  averageScore: number
}

export interface TopGroupRow extends RankedGroup {
  rank: number
  isYou: boolean
}

// "Top cities — two tracks": takes a pre-sorted, pre-cohort-filtered list of
// groups (e.g. toAverageScoreByGroup or toDistribution output) and returns
// the real top 5, adding the user's own group as a conditional 6th row only
// if it didn't already make the top 5. Works for either ranking track since
// the caller controls the sort order of `groups`.
export function buildTopCities(groups: RankedGroup[], userLabel: string | null, limit = 5): TopGroupRow[] {
  const ranked = groups.map((group, index) => ({
    ...group,
    rank: index + 1,
    isYou: group.label === userLabel,
  }))

  const topN = ranked.slice(0, limit)
  if (userLabel && !topN.some((row) => row.isYou)) {
    const userRow = ranked.find((row) => row.label === userLabel)
    if (userRow) return [...topN, userRow]
  }

  return topN
}

export interface RecentAttempt {
  domain: string
  score: number
  completedAt: string
  scoreChangeFromPrevious: number | null
}

// The "Recent attempts" table: newest first, each row diffed against the
// attempt immediately before it (regardless of domain), capped at `limit` rows.
export function buildRecentAttempts(userAttempts: DomainResultRow[], limit = 8): RecentAttempt[] {
  const sortedNewestFirst = [...userAttempts].sort((a, b) => b.completed_at.localeCompare(a.completed_at))

  return sortedNewestFirst.slice(0, limit).map((attempt, index) => {
    const previous = sortedNewestFirst[index + 1]
    return {
      domain: attempt.domain,
      score: attempt.score,
      completedAt: attempt.completed_at,
      scoreChangeFromPrevious: previous ? attempt.score - previous.score : null,
    }
  })
}

export interface WeekOverWeek {
  thisWeekAverage: number | null
  lastWeekAverage: number | null
  change: number | null
}

// "This week" tile: average score in the last 7 days vs. the 7 days before
// that. `today` is injectable so tests aren't wall-clock dependent.
export function buildWeekOverWeek(userAttempts: ResultRow[], today: Date = new Date()): WeekOverWeek {
  const oneDayMs = 86_400_000
  const startOfThisWeek = today.getTime() - 7 * oneDayMs
  const startOfLastWeek = startOfThisWeek - 7 * oneDayMs

  const thisWeek: number[] = []
  const lastWeek: number[] = []
  for (const attempt of userAttempts) {
    const completedAt = new Date(attempt.completed_at).getTime()
    if (completedAt >= startOfThisWeek && completedAt <= today.getTime()) {
      thisWeek.push(attempt.score)
    } else if (completedAt >= startOfLastWeek && completedAt < startOfThisWeek) {
      lastWeek.push(attempt.score)
    }
  }

  const thisWeekAverage = thisWeek.length > 0 ? roundToOne(thisWeek.reduce((s, v) => s + v, 0) / thisWeek.length) : null
  const lastWeekAverage = lastWeek.length > 0 ? roundToOne(lastWeek.reduce((s, v) => s + v, 0) / lastWeek.length) : null

  return {
    thisWeekAverage,
    lastWeekAverage,
    change:
      thisWeekAverage !== null && lastWeekAverage !== null ? roundToOne(thisWeekAverage - lastWeekAverage) : null,
  }
}

export function getLocationDimension(locationParams: LocationParams) {
  const { country, stateRegion, city } = locationParams

  if (!country || country === 'all') {
    return {
      label: 'Countries',
      getValue: (entry: ScoreEntry) => entry.profile.country,
    }
  }
  if (!stateRegion || stateRegion === 'all') {
    return {
      label: 'States / Regions',
      getValue: (entry: ScoreEntry) => entry.profile.state_region,
    }
  }
  if (!city || city === 'all') {
    return {
      label: 'Cities',
      getValue: (entry: ScoreEntry) => entry.profile.city,
    }
  }

  return {
    label: null,
    getValue: null,
  }
}
