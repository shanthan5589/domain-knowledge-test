import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { matchesEmailFilter, resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { isRateLimited } from '@/lib/rate-limit'
import { latestResultsForDomain } from '@/lib/latest-results'
import { latestByKey } from '@/lib/latest-by-key'
import {
  MIN_COHORT_SIZE,
  averageTimeFor,
  buildLocationComparisons,
  buildNeighbors,
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

  try {
    if (await isRateLimited(req, 'stats', 120, 60, session.user.email)) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to fetch stats' }, { status: 503 })
  }

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const { data: results, error } = await latestResultsForDomain(domain)

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  // Keep only each user's most recent attempt for this domain (rows already ordered newest-first)
  const resultRows = results as ResultRow[]
  const latestByEmail = latestByKey(resultRows, (row) => row.user_email)
  const userProgress = buildUserProgress(
    resultRows.filter((row) => row.user_email === session.user.email)
  )
  const locationParams = readLocationParams(req)
  const locationDimension = getLocationDimension(locationParams)

  // Nobody has ever completed this domain — nothing to aggregate, and no
  // profiles worth fetching.
  if (latestByEmail.size === 0) {
    return NextResponse.json({
      histogram: new Array(11).fill(0),
      totalUsers: 0,
      yourScore: null,
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
      locationDistributionLabel: locationDimension.label,
      locationComparisons: [],
      userProgress,
      rankLadder: [],
      peerGroupRanks: [],
      topCitiesByScore: [],
      topCitiesByParticipation: [],
      averageScoreByState: [],
      testTakersByState: [],
      neighbors: [],
    })
  }

  // The full crowd: every filter (designation, experience, country, state,
  // city) narrows this down. Drives the score distribution, percentile,
  // role/experience/location breakdowns, and "where you stand" widgets.
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
  const matchingEmails = [...latestByEmail.keys()].filter((email) => matchesEmailFilter(emailFilter, email))

  // Profiles for every attempter, not just the ones matching the active
  // filters — needed so the domain+country-only widgets below (Top cities,
  // Average/test-takers by state, Peer groups) can build their own broader
  // cohort from the same fetch, without a second round trip.
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name, designation, years_of_experience, country, state_region, city')
    .in('email', [...latestByEmail.keys()])

  if (profileError || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const profileByEmail = new Map(
    (profiles as ProfileRow[]).map((profile) => [profile.email, profile])
  )

  function buildEntries(emails: string[]): ScoreEntry[] {
    // Ignore result rows whose profile has been deleted so community numbers
    // reflect real users, not old test data.
    return emails
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
  }

  const entries = buildEntries(matchingEmails)

  // A broader crowd scoped to domain + country only — designation, experience,
  // state, and city never narrow this one. Top cities, Average/test-takers by
  // state, and Peer groups all read from this instead of `entries`: those
  // widgets exist to show a state/city leaderboard or a peer breakdown, which
  // collapses to "just you" the moment city/state/designation/experience
  // filters apply to them too. Country is kept so a state/city leaderboard
  // doesn't mix places from different countries into one ranking.
  const countryParam = locationParams.country?.trim()
  const countryFilterActive = !!countryParam && countryParam !== 'all'
  const countryMatchingEmails = countryFilterActive
    ? [...latestByEmail.keys()].filter((email) => profileByEmail.get(email)?.country === countryParam)
    : [...latestByEmail.keys()]
  const countryEntries = buildEntries(countryMatchingEmails)

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

  // City/state rankings feed both the "Top cities" and "Average/test-takers by
  // state" widgets. Computed once here from `countryEntries`, then re-sorted
  // per widget so a city that's below the cohort floor never appears in any
  // of them. "isYou" is resolved straight from the profile map so it's never
  // affected by which filters happen to be active.
  const userCity = profileByEmail.get(session.user.email)?.city ?? null
  const userState = profileByEmail.get(session.user.email)?.state_region ?? null

  const cityGroupsByScore = withMinCohortSize(
    toAverageScoreByGroup(countryEntries, (entry) => entry.profile.city)
  )
  const cityGroupsByParticipation = [...cityGroupsByScore].sort(
    (a, b) => b.count - a.count || b.averageScore - a.averageScore
  )

  const stateGroupsByScore = withMinCohortSize(
    toAverageScoreByGroup(countryEntries, (entry) => entry.profile.state_region)
  )
  const stateGroupsByParticipation = [...stateGroupsByScore].sort(
    (a, b) => b.count - a.count || b.averageScore - a.averageScore
  )

  // Both leaderboards show the real top 10, plus a conditional extra row for
  // your own place if it didn't already make the cut (see buildTopCities).
  const LEADERBOARD_SIZE = 10

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
    // Domain + country scoped (see countryEntries above) — a peer group like
    // "Role: Data Scientist" should compare against every Data Scientist in
    // (your country's) crowd, not just the ones who also happen to match
    // whatever Designation/Experience/City/State filters are active.
    peerGroupRanks: buildPeerGroupRanks(countryEntries, session.user.email, [
      { dimension: 'Role', getLabel: (entry) => entry.profile.designation },
      { dimension: 'Experience', getLabel: (entry) => entry.profile.years_of_experience },
      { dimension: 'City', getLabel: (entry) => entry.profile.city },
      { dimension: 'State / Region', getLabel: (entry) => entry.profile.state_region },
      { dimension: 'Country', getLabel: (entry) => entry.profile.country },
    ]),
    topCitiesByScore: buildTopCities(cityGroupsByScore, userCity, LEADERBOARD_SIZE),
    topCitiesByParticipation: buildTopCities(cityGroupsByParticipation, userCity, LEADERBOARD_SIZE),
    averageScoreByState: buildTopCities(stateGroupsByScore, userState, LEADERBOARD_SIZE),
    testTakersByState: buildTopCities(stateGroupsByParticipation, userState, LEADERBOARD_SIZE),
    neighbors: buildNeighbors(entries, session.user.email),
  })
}
