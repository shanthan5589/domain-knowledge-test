import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { resolveEmailFilter } from '@/lib/stats-filters'
import type { Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('domain, user_email, score, completed_at')
    .order('completed_at', { ascending: false })

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

  const averageScoreByDomain: Partial<Record<Domain, number | null>> = {}
  const attemptCounts: Partial<Record<Domain, number>> = {}
  let mostAttemptedDomain: Domain | null = null
  let maxCount = 0

  for (const domain of VALID_DOMAINS) {
    const emailMap = latestByDomain.get(domain) ?? new Map<string, number>()
    let sum = 0
    let count = 0
    for (const [email, score] of emailMap) {
      if (emailFilter && !emailFilter.has(email)) continue
      sum += score
      count += 1
    }

    attemptCounts[domain] = count
    averageScoreByDomain[domain] = count > 0 ? Math.round((sum / count) * 10) / 10 : null

    if (count > maxCount) {
      maxCount = count
      mostAttemptedDomain = domain
    }
  }

  return NextResponse.json({ averageScoreByDomain, attemptCounts, mostAttemptedDomain })
}
