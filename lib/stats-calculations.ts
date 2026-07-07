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
export const MIN_COHORT_SIZE = 5

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
