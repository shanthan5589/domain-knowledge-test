import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']
const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain || !VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10)
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1), MAX_LIMIT)

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('user_email, score, completed_at')
    .eq('domain', domain)
    .order('completed_at', { ascending: false })

  if (error || !results) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  // One entry per user — their most recent attempt (rows already ordered newest-first)
  const latestByEmail = new Map<string, { score: number; completed_at: string }>()
  for (const row of results as { user_email: string; score: number; completed_at: string }[]) {
    if (!latestByEmail.has(row.user_email)) {
      latestByEmail.set(row.user_email, { score: row.score, completed_at: row.completed_at })
    }
  }

  if (latestByEmail.size === 0) {
    return NextResponse.json({ leaderboard: [] })
  }

  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .in('email', [...latestByEmail.keys()])

  if (profileError) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }

  const nameByEmail = new Map(
    (profiles as { email: string; full_name: string | null }[]).map((p) => [p.email, p.full_name])
  )

  const leaderboard = [...latestByEmail.entries()]
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
