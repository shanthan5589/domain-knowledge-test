// Pure calculation helpers for the /api/stats endpoint. Kept free of Next.js
// request/response types and Supabase access so they can be unit tested
// directly against plain inputs.

export interface ProfileRow {
  email: string
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
export const MIN_COHORT_SIZE = 3

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
