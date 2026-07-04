import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
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

  const designation = req.nextUrl.searchParams.get('designation')

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

  // Optionally restrict the crowd to a single designation
  let emailFilter: Set<string> | null = null
  if (designation && designation !== 'all') {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('designation', designation)

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

  // Your own score is always reported, even if the designation filter excludes you
  const yourScore = latestByEmail.get(session.user.email) ?? null

  return NextResponse.json({ histogram, totalUsers, yourScore })
}
