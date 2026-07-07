import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'

// Cap on how many result rows we pull before aggregating in memory — keeps a
// single request from pulling an unbounded table scan across every domain.
const RESULTS_QUERY_LIMIT = 5000

// Minimum number of distinct users a per-domain breakdown must contain before
// we're willing to report its aggregate numbers back to the client. Prevents a
// narrow profile filter from de-anonymizing one or two real people.
const MIN_COHORT_SIZE = 5

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('domain, user_email, score, completed_at')
    .in('domain', VALID_DOMAINS)
    .order('completed_at', { ascending: false })
    .limit(RESULTS_QUERY_LIMIT)

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }

  // One score per user per domain — their most recent attempt (rows already ordered newest-first)
  const latestByDomain = new Map<Domain, Map<string, number>>()
  for (const row of results as { domain: string; user_email: string; score: number }[]) {
    const domain = row.domain as Domain
    if (!latestByDomain.has(domain)) {
      latestByDomain.set(domain, new Map())
    }
    const emailMap = latestByDomain.get(domain)!
    if (!emailMap.has(row.user_email)) {
      emailMap.set(row.user_email, row.score)
    }
  }

  // Optionally restrict the crowd by any combination of profile attributes
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
  let existingProfileEmails: Set<string> | null = null
  if (!emailFilter) {
    const allEmails = new Set<string>()
    for (const emailMap of latestByDomain.values()) {
      for (const email of emailMap.keys()) allEmails.add(email)
    }

    if (allEmails.size > 0) {
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .in('email', [...allEmails])

      if (profileError || !profiles) {
        return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
      }

      existingProfileEmails = new Set((profiles as { email: string }[]).map((profile) => profile.email))
    }
  }

  const averageScoreByDomain: Partial<Record<Domain, number | null>> = {}
  const attemptCounts: Partial<Record<Domain, number>> = {}
  const userLatestScoreByDomain: Partial<Record<Domain, number | null>> = {}
  const userBestScoreByDomain: Partial<Record<Domain, number | null>> = {}
  const userAttemptCountsByDomain: Partial<Record<Domain, number>> = {}
  let mostAttemptedDomain: Domain | null = null
  let maxCount = 0

  for (const domain of VALID_DOMAINS) {
    const emailMap = latestByDomain.get(domain) ?? new Map<string, number>()
    let sum = 0
    let count = 0
    for (const [email, score] of emailMap) {
      if (emailFilter && !emailFilter.has(email)) continue
      if (existingProfileEmails && !existingProfileEmails.has(email)) continue
      sum += score
      count += 1
    }

    attemptCounts[domain] = count
    // Suppress the average for cohorts too small to report without risking
    // de-anonymization of a handful of filtered users.
    averageScoreByDomain[domain] = count >= MIN_COHORT_SIZE ? Math.round((sum / count) * 10) / 10 : null

    const userRowsForDomain = (results as { domain: string; user_email: string; score: number }[])
      .filter((row) => row.domain === domain && row.user_email === session.user.email)
    userLatestScoreByDomain[domain] = userRowsForDomain[0]?.score ?? null
    userBestScoreByDomain[domain] =
      userRowsForDomain.length > 0 ? Math.max(...userRowsForDomain.map((row) => row.score)) : null
    userAttemptCountsByDomain[domain] = userRowsForDomain.length

    if (count > maxCount) {
      maxCount = count
      mostAttemptedDomain = domain
    }
  }

  return NextResponse.json({
    averageScoreByDomain,
    attemptCounts,
    mostAttemptedDomain,
    userLatestScoreByDomain,
    userBestScoreByDomain,
    userAttemptCountsByDomain,
  })
}
