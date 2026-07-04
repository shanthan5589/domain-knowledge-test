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

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('user_email, score, completed_at')
    .eq('domain', domain)
    .order('completed_at', { ascending: false })

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  // Keep only each user's most recent attempt for this domain (rows already ordered newest-first)
  const latestByEmail = new Map<string, number>()
  for (const row of results as { user_email: string; score: number }[]) {
    if (!latestByEmail.has(row.user_email)) {
      latestByEmail.set(row.user_email, row.score)
    }
  }

  // Optionally restrict the crowd by any combination of profile attributes
  const { emailFilter, error: filterError } = await resolveEmailFilter(req)
  if (filterError) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }

  const histogram = new Array(11).fill(0)
  let totalUsers = 0
  for (const [email, score] of latestByEmail) {
    if (emailFilter && !emailFilter.has(email)) continue
    histogram[score] += 1
    totalUsers += 1
  }

  // Your own score is always reported, even if the filters exclude you
  const yourScore = latestByEmail.get(session.user.email) ?? null

  // Percentile: what share of your peers in the (filtered) crowd you outscored.
  // If you belong to that crowd, exclude yourself from the comparison denominator —
  // otherwise being the sole top scorer among 5 people would read as "80%" instead of 100%.
  let percentile: number | null = null
  if (yourScore !== null && totalUsers > 0) {
    const youAreInGroup = !emailFilter || emailFilter.has(session.user.email)
    const peerCount = youAreInGroup ? totalUsers - 1 : totalUsers
    if (peerCount > 0) {
      let scoredLower = 0
      for (let s = 0; s < yourScore; s++) scoredLower += histogram[s]
      percentile = Math.round((scoredLower / peerCount) * 100)
    }
  }

  return NextResponse.json({ histogram, totalUsers, yourScore, percentile })
}
