import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

interface ProfileRow {
  email: string
  designation: string | null
  years_of_experience: string | null
  country: string | null
  state_region: string | null
  city: string | null
}

interface ScoreEntry {
  email: string
  score: number
  time_taken_seconds: number
  completed_at: string
  profile: ProfileRow
}

interface LatestResult {
  score: number
  time_taken_seconds: number
  completed_at: string
}

interface ResultRow {
  user_email: string
  score: number
  time_taken_seconds: number
  completed_at: string
}

function toDistribution(
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
function toAverageScoreByGroup(
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

// Minimum number of distinct users a segment/breakdown must contain before we're
// willing to report it back to the client. Narrow filters (e.g. a rare
// designation in a small city) can otherwise de-anonymize one or two real
// people. Any group row (distribution bucket, average-by-group bucket, or
// location comparison) that falls below this is dropped rather than returned.
const MIN_COHORT_SIZE = 5

function withMinCohortSize<T extends { count: number }>(rows: T[]): T[] {
  return rows.filter((row) => row.count >= MIN_COHORT_SIZE)
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10
}

function averageScoreFor(entries: ScoreEntry[]) {
  if (entries.length === 0) return null
  return roundToOne(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
}

function averageTimeFor(entries: ScoreEntry[]) {
  if (entries.length === 0) return null
  return Math.round(
    entries.reduce((sum, entry) => sum + entry.time_taken_seconds, 0) / entries.length
  )
}

function buildLocationComparisons(req: NextRequest, entries: ScoreEntry[]) {
  const country = req.nextUrl.searchParams.get('country')
  const stateRegion = req.nextUrl.searchParams.get('state_region')
  const city = req.nextUrl.searchParams.get('city')

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

function buildUserProgress(userAttempts: ResultRow[]) {
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

// Cap on how many result rows we pull for a single domain before aggregating in
// memory. Well above any realistic per-domain attempt volume for this app, but
// keeps a single request from pulling an unbounded table scan.
const RESULTS_QUERY_LIMIT = 5000

function getLocationDimension(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const stateRegion = req.nextUrl.searchParams.get('state_region')
  const city = req.nextUrl.searchParams.get('city')

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

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('user_email, score, time_taken_seconds, completed_at')
    .eq('domain', domain)
    .order('completed_at', { ascending: false })
    .limit(RESULTS_QUERY_LIMIT)

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  // Keep only each user's most recent attempt for this domain (rows already ordered newest-first)
  const resultRows = results as ResultRow[]
  const latestByEmail = new Map<string, LatestResult>()
  for (const row of resultRows) {
    if (!latestByEmail.has(row.user_email)) {
      latestByEmail.set(row.user_email, {
        score: row.score,
        time_taken_seconds: row.time_taken_seconds,
        completed_at: row.completed_at,
      })
    }
  }
  const userProgress = buildUserProgress(
    resultRows.filter((row) => row.user_email === session.user.email)
  )

  // Optionally restrict the crowd by any combination of profile attributes
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const matchingEmails = [...latestByEmail.keys()].filter((email) => !emailFilter || emailFilter.has(email))

  if (matchingEmails.length === 0) {
    return NextResponse.json({
      histogram: new Array(11).fill(0),
      totalUsers: 0,
      yourScore: latestByEmail.get(session.user.email)?.score ?? null,
      yourRank: null,
      percentile: null,
      averageScore: null,
      medianScore: null,
      modeScore: null,
      topScore: null,
      lowScore: null,
      averageTimeSeconds: null,
      topScoreCount: 0,
      topScorePercent: 0,
      roleDistribution: [],
      roleAverageScores: [],
      experienceAverageScores: [],
      experienceDistribution: [],
      locationDistribution: [],
      locationAverageScores: [],
      locationDistributionLabel: getLocationDimension(req).label,
      locationComparisons: [],
      userProgress,
    })
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, designation, years_of_experience, country, state_region, city')
    .in('email', [...latestByEmail.keys()])

  if (profileError || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const profileByEmail = new Map(
    (profiles as ProfileRow[]).map((profile) => [profile.email, profile])
  )

  // Ignore result rows whose profile has been deleted so community numbers
  // reflect real users, not old test data.
  const entries: ScoreEntry[] = matchingEmails
    .map((email) => {
      const profile = profileByEmail.get(email)
      const latest = latestByEmail.get(email)
      if (!profile) return null
      if (!latest) return null
      return {
        email,
        score: latest.score,
        time_taken_seconds: latest.time_taken_seconds,
        completed_at: latest.completed_at,
        profile,
      }
    })
    .filter((entry): entry is ScoreEntry => entry !== null)

  const histogram = new Array(11).fill(0)
  let scoreSum = 0
  let topScore: number | null = null
  for (const { score } of entries) {
    histogram[score] += 1
    scoreSum += score
    topScore = topScore === null ? score : Math.max(topScore, score)
  }

  const totalUsers = entries.length
  const averageScore = totalUsers > 0 ? roundToOne(scoreSum / totalUsers) : null
  const averageTimeSeconds = averageTimeFor(entries)
  const sortedScores = entries.map((entry) => entry.score).sort((a, b) => a - b)
  const medianScore =
    totalUsers === 0
      ? null
      : totalUsers % 2 === 1
        ? sortedScores[Math.floor(totalUsers / 2)]
        : Math.round(((sortedScores[totalUsers / 2 - 1] + sortedScores[totalUsers / 2]) / 2) * 10) / 10
  const modeScore =
    totalUsers === 0
      ? null
      : histogram.reduce(
          (bestScore, count, score) => (count > histogram[bestScore] ? score : bestScore),
          0
        )
  const lowScore = totalUsers > 0 ? sortedScores[0] : null
  const topScoreCount = topScore === null ? 0 : entries.filter((entry) => entry.score === topScore).length
  const topScorePercent = totalUsers > 0 ? Math.round((topScoreCount / totalUsers) * 100) : 0

  // Your own score is always reported, even if the filters exclude you
  const yourScore = latestByEmail.get(session.user.email)?.score ?? null
  const youAreInGroup = entries.some((entry) => entry.email === session.user.email)

  // Percentile: what share of your peers in the (filtered) crowd you outscored.
  // Exclude yourself from the comparison denominator — otherwise being the sole
  // top scorer among 5 people would read as "80%" instead of 100%.
  // If you don't actually belong to the active filtered cohort (e.g. you've
  // filtered the view to a role/location you aren't in), comparing you against
  // it wouldn't mean anything — omit the percentile in that case instead of
  // reporting a number against a group you're not part of.
  let percentile: number | null = null
  if (youAreInGroup && yourScore !== null && totalUsers > 0) {
    const peerCount = totalUsers - 1
    if (peerCount > 0) {
      let scoredLower = 0
      for (let s = 0; s < yourScore; s++) scoredLower += histogram[s]
      percentile = Math.round((scoredLower / peerCount) * 100)
    }
  }

  // Standard competition ranking (1224 style): people who scored higher than you push
  // your rank down, ties share the same rank. Only meaningful if you're part of this crowd.
  const yourRank =
    yourScore !== null && youAreInGroup
      ? entries.filter((entry) => entry.score > yourScore).length + 1
      : null

  const locationDimension = getLocationDimension(req)

  return NextResponse.json({
    histogram,
    totalUsers,
    yourScore,
    yourRank,
    percentile,
    averageScore,
    medianScore,
    modeScore,
    topScore,
    lowScore,
    averageTimeSeconds,
    topScoreCount,
    topScorePercent,
    roleDistribution: withMinCohortSize(toDistribution(entries, (entry) => entry.profile.designation)),
    roleAverageScores: withMinCohortSize(toAverageScoreByGroup(entries, (entry) => entry.profile.designation)),
    experienceAverageScores: withMinCohortSize(
      toAverageScoreByGroup(entries, (entry) => entry.profile.years_of_experience)
    ),
    experienceDistribution: withMinCohortSize(
      toDistribution(entries, (entry) => entry.profile.years_of_experience)
    ),
    locationDistribution: locationDimension.getValue
      ? withMinCohortSize(toDistribution(entries, locationDimension.getValue))
      : [],
    locationAverageScores: locationDimension.getValue
      ? withMinCohortSize(toAverageScoreByGroup(entries, locationDimension.getValue))
      : [],
    locationDistributionLabel: locationDimension.label,
    // Use the same filtered cohort as the rest of this response so "Local vs
    // Global" comparisons share one consistent reference frame, instead of
    // comparing the filtered view against a differently-scoped (unfiltered)
    // crowd that includes people outside the active filters.
    locationComparisons: buildLocationComparisons(req, entries),
    userProgress,
  })
}
