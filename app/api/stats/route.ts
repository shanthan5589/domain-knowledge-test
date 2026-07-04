import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

// Profile columns that can be used to narrow down the comparison crowd
const FILTERABLE_PROFILE_COLUMNS = [
  ['designation', 'designation'],
  ['country', 'country'],
  ['state_region', 'state_region'],
  ['city', 'city'],
  ['experience', 'years_of_experience'],
] as const

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
  let emailFilter: Set<string> | null = null
  const activeFilters = FILTERABLE_PROFILE_COLUMNS.filter(([param]) => {
    const value = req.nextUrl.searchParams.get(param)
    return value && value !== 'all'
  })

  if (activeFilters.length > 0) {
    let profileQuery = supabaseAdmin.from('profiles').select('email')
    for (const [param, column] of activeFilters) {
      profileQuery = profileQuery.eq(column, req.nextUrl.searchParams.get(param) as string)
    }

    const { data: profiles, error: profileError } = await profileQuery
    if (profileError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
    emailFilter = new Set((profiles ?? []).map((p: { email: string }) => p.email))
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

  // Percentile: what share of the (filtered) crowd you outscored
  let percentile: number | null = null
  if (yourScore !== null && totalUsers > 0) {
    let scoredLower = 0
    for (let s = 0; s < yourScore; s++) scoredLower += histogram[s]
    percentile = Math.round((scoredLower / totalUsers) * 100)
  }

  return NextResponse.json({ histogram, totalUsers, yourScore, percentile })
}
