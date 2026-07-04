import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

export async function GET() {
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
  const latest = new Map<string, number>()
  for (const row of results as { domain: string; user_email: string; score: number }[]) {
    const key = `${row.domain}:${row.user_email}`
    if (!latest.has(key)) {
      latest.set(key, row.score)
    }
  }

  const sums: Partial<Record<Domain, number>> = {}
  const counts: Partial<Record<Domain, number>> = {}
  for (const [key, score] of latest) {
    const domain = key.split(':')[0] as Domain
    sums[domain] = (sums[domain] ?? 0) + score
    counts[domain] = (counts[domain] ?? 0) + 1
  }

  const averageScoreByDomain: Partial<Record<Domain, number>> = {}
  const attemptCounts: Partial<Record<Domain, number>> = {}
  let mostAttemptedDomain: Domain | null = null
  let maxCount = 0

  for (const domain of VALID_DOMAINS) {
    const count = counts[domain] ?? 0
    attemptCounts[domain] = count
    averageScoreByDomain[domain] = count > 0 ? Math.round((sums[domain]! / count) * 10) / 10 : null

    if (count > maxCount) {
      maxCount = count
      mostAttemptedDomain = domain
    }
  }

  return NextResponse.json({ averageScoreByDomain, attemptCounts, mostAttemptedDomain })
}
