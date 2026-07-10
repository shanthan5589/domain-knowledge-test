import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { isRateLimited } from '@/lib/rate-limit'
import { latestResultsForAllDomains } from '@/lib/latest-results'
import { latestByKey } from '@/lib/latest-by-key'
import {
  buildActivityCalendar,
  buildDomainRadar,
  buildDomainRanges,
  buildPacePoints,
  buildRecentAttempts,
  buildStreaks,
  buildTimeOfDayPerformance,
  buildWeekOverWeek,
  type DomainResultRow,
  type DomainScoreEntry,
  type ProfileRow,
} from '@/lib/stats-calculations'

// Cap on how many result rows we pull before aggregating in memory — keeps a
// single request from pulling an unbounded table scan across every domain.
const RESULTS_QUERY_LIMIT = 5000

// Feeds the "You, over time" and Domain Radar widgets, which look at a user's
// activity across every domain at once rather than the single domain the rest
// of the Stats page is filtered to.
export async function GET(req: NextRequest) {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

  try {
    if (await isRateLimited(req, 'stats-personal', 120, 60, session.user.email)) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to fetch personal stats' }, { status: 503 })
  }

  const { data: myResults, error: myError } = await supabaseAdmin
    .from('test_results')
    .select('user_email, score, time_taken_seconds, completed_at, domain')
    .eq('user_email', session.user.email)
    .order('completed_at', { ascending: false })
    .limit(RESULTS_QUERY_LIMIT)

  if (myError || !myResults) {
    return NextResponse.json({ error: 'Failed to fetch personal stats' }, { status: 500 })
  }

  const myAttempts = myResults as DomainResultRow[]

  const domain = req.nextUrl.searchParams.get('domain')
  const filteredAttempts = domain && domain !== 'all' ? myAttempts.filter((a) => a.domain === domain) : myAttempts

  const activityCalendar = buildActivityCalendar(filteredAttempts)
  const streaks = buildStreaks(filteredAttempts)
  const timeOfDayPerformance = buildTimeOfDayPerformance(filteredAttempts)
  const pacePoints = buildPacePoints(filteredAttempts)
  const domainRanges = buildDomainRanges(myAttempts) // Intentionally global
  const recentAttempts = buildRecentAttempts(myAttempts)
  const weekOverWeek = buildWeekOverWeek(filteredAttempts)

  // Domain Radar compares your per-domain average against your city/country
  // peers' per-domain average, so it needs everyone's latest attempt per
  // domain rather than just your own attempts.
  const city = req.nextUrl.searchParams.get('city')
  const country = req.nextUrl.searchParams.get('country')

  const { data: crowdResults, error: crowdError } = await latestResultsForAllDomains()

  if (crowdError || !crowdResults) {
    return NextResponse.json({ error: 'Failed to fetch personal stats' }, { status: 500 })
  }

  const crowdRows = crowdResults as DomainResultRow[]
  const latestByUserDomain = latestByKey(crowdRows, (row) => `${row.user_email}::${row.domain}`)
  const relevantEmails = [...new Set([...latestByUserDomain.values()].map((row) => row.user_email))]

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, designation, years_of_experience, country, state_region, city')
    .in('email', relevantEmails)

  if (profileError || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch personal stats' }, { status: 500 })
  }

  const profileByEmail = new Map((profiles as ProfileRow[]).map((profile) => [profile.email, profile]))

  // Ignore result rows whose profile has been deleted, same as /api/stats.
  const domainEntries: DomainScoreEntry[] = [...latestByUserDomain.values()]
    .map((row) => {
      const profile = profileByEmail.get(row.user_email)
      if (!profile) return null
      return {
        email: row.user_email,
        score: row.score,
        time_taken_seconds: row.time_taken_seconds,
        completed_at: row.completed_at,
        domain: row.domain,
        profile,
      }
    })
    .filter((entry): entry is DomainScoreEntry => entry !== null)

  const domainRadar = buildDomainRadar(domainEntries, session.user.email, { city, country }, [
    ...VALID_DOMAINS,
  ])

  return NextResponse.json({
    activityCalendar,
    streaks,
    timeOfDayPerformance,
    pacePoints,
    domainRanges,
    domainRadar,
    recentAttempts,
    weekOverWeek,
  })
}
