import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { matchesEmailFilter, resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { latestByKey } from '@/lib/latest-by-key'
import {
  MIN_COHORT_SIZE,
  averageTimeFor,
  buildLocationComparisons,
  buildPeerGroupRanks,
  buildRankLadder,
  buildTopCities,
  buildUserProgress,
  getLocationDimension,
  roundToOne,
  toAverageScoreByGroup,
  toDistribution,
  type LocationParams,
  type ProfileRow,
  type ResultRow,
  type ScoreEntry,
} from '@/lib/stats-calculations'

function withMinCohortSize<T extends { count: number }>(rows: T[]): T[] {
  return rows.filter((row) => row.count >= MIN_COHORT_SIZE)
}

// Cap on how many result rows we pull for a single domain before aggregating in
// memory. Well above any realistic per-domain attempt volume for this app, but
// keeps a single request from pulling an unbounded table scan.
const RESULTS_QUERY_LIMIT = 5000

function readLocationParams(req: NextRequest): LocationParams {
  return {
    country: req.nextUrl.searchParams.get('country'),
    stateRegion: req.nextUrl.searchParams.get('state_region'),
    city: req.nextUrl.searchParams.get('city'),
  }
}

export async function GET(req: NextRequest) {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

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
  const latestByEmail = latestByKey(resultRows, (row) => row.user_email)
  const userProgress = buildUserProgress(
    resultRows.filter((row) => row.user_email === session.user.email)
  )

  // Optionally restrict the crowd by any combination of profile attributes
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const matchingEmails = [...latestByEmail.keys()].filter((email) => matchesEmailFilter(emailFilter, email))

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
      locationDistributionLabel: getLocationDimension(readLocationParams(req)).label,
      locationComparisons: [],
      userProgress,
      rankLadder: [],
      peerGroupRanks: [],
      topCitiesByScore: [],
      topCitiesByParticipation: [],
      averageScoreByState: [],
      testTakersByState: [],
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

  const locationParams = readLocationParams(req)
  const locationDimension = getLocationDimension(locationParams)

  // City rankings feed both the "Top cities" and "Average/test-takers by
  // state" widgets. Computed once here, then re-sorted per widget so a city
  // that's below the cohort floor never appears in any of them.
  const userCity = entries.find((entry) => entry.email === session.user.email)?.profile.city ?? null
  const cityGroupsByScore = withMinCohortSize(toAverageScoreByGroup(entries, (entry) => entry.profile.city))
  const cityGroupsByParticipation = [...cityGroupsByScore].sort(
    (a, b) => b.count - a.count || b.averageScore - a.averageScore
  )

  const stateGroupsByScore = withMinCohortSize(
    toAverageScoreByGroup(entries, (entry) => entry.profile.state_region)
  )
  const stateGroupsByParticipation = [...stateGroupsByScore].sort(
    (a, b) => b.count - a.count || b.averageScore - a.averageScore
  )

  // Dynamic top 15: shows fewer rows (down to however many states have data)
  // rather than padding out to a fixed count.
  const STATE_LEADERBOARD_SIZE = 15

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
    locationComparisons: buildLocationComparisons(locationParams, entries),
    userProgress,
    rankLadder: buildRankLadder(locationParams, entries, session.user.email),
    peerGroupRanks: buildPeerGroupRanks(entries, session.user.email, [
      { dimension: 'Role', getLabel: (entry) => entry.profile.designation },
      { dimension: 'Experience', getLabel: (entry) => entry.profile.years_of_experience },
      { dimension: 'City', getLabel: (entry) => entry.profile.city },
      { dimension: 'State / Region', getLabel: (entry) => entry.profile.state_region },
      { dimension: 'Country', getLabel: (entry) => entry.profile.country },
    ]),
    topCitiesByScore: buildTopCities(cityGroupsByScore, userCity),
    topCitiesByParticipation: buildTopCities(cityGroupsByParticipation, userCity),
    averageScoreByState: stateGroupsByScore.slice(0, STATE_LEADERBOARD_SIZE),
    testTakersByState: stateGroupsByParticipation.slice(0, STATE_LEADERBOARD_SIZE),
  })
}
