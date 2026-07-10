import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { matchesEmailFilter, resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { isRateLimited } from '@/lib/rate-limit'
import { latestResultsForDomain } from '@/lib/latest-results'
import { latestByKey } from '@/lib/latest-by-key'

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

// Minimum number of distinct users a filtered cohort must contain before we're
// willing to reveal individual display names. A narrow filter (e.g. a rare
// designation in a small city) could otherwise de-anonymize one or two people.
const MIN_COHORT_SIZE = 3

export async function GET(req: NextRequest) {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

  try {
    if (await isRateLimited(req, 'leaderboard', 60, 60, session.user.email)) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to fetch leaderboard' }, { status: 503 })
  }

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10)
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1), MAX_LIMIT)

  const { data: results, error } = await latestResultsForDomain(domain)

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  // One entry per user — their most recent attempt (rows already ordered newest-first)
  const latestByEmail = latestByKey(
    results as { user_email: string; score: number; completed_at: string }[],
    (row) => row.user_email
  )

  // Optionally restrict the crowd by any combination of profile attributes
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  const filteredEntries = [...latestByEmail.entries()].filter(
    ([email]) => matchesEmailFilter(emailFilter, email)
  )

  if (filteredEntries.length === 0) {
    return NextResponse.json({ leaderboard: [] })
  }

  // A filtered cohort smaller than the minimum size would let a narrow filter
  // (e.g. a rare designation/city combination) single out a real person's name
  // and score. Refuse to reveal names for such small groups, but report how many
  // people matched so the client can distinguish this from "nobody has attempted
  // this domain" instead of showing the same empty state for both.
  if (emailFilter && filteredEntries.length < MIN_COHORT_SIZE) {
    return NextResponse.json({ leaderboard: [], suppressedCount: filteredEntries.length })
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .in('email', filteredEntries.map(([email]) => email))

  if (profileError || !profiles) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  const nameByEmail = new Map(
    (profiles as { email: string; full_name: string | null }[]).map((p) => [p.email, p.full_name])
  )

  const leaderboard = filteredEntries
    .filter(([email]) => nameByEmail.has(email))
    .map(([email, { score, completed_at }]) => ({
      name: nameByEmail.get(email) ?? 'Anonymous',
      score,
      completed_at,
      isYou: email === session.user.email,
    }))
    // Higher score first; on a tie, whoever reached that score earliest ranks higher
    .sort((a, b) => b.score - a.score || new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
    .slice(0, limit)
    .map(({ name, score, isYou }) => ({ name, score, isYou }))

  return NextResponse.json({ leaderboard })
}
