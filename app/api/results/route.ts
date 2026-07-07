import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { SubmitResultPayload } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'

// Every test consists of exactly this many questions — enforce it exactly so a
// crafted request can't submit fewer (easier, cherry-picked) questions to
// inflate the resulting percentage score.
const MAX_QUESTIONS_PER_TEST = 10

// Duplicate-submission window: if a result for the same user+domain already
// exists within this many seconds, treat a new submission as a duplicate
// instead of inserting a second row (handles double-submits from retries,
// double-clicks, or a timer/manual-submit race).
const DUPLICATE_SUBMISSION_WINDOW_SECONDS = 10

export async function GET() {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

  const { data: results, error } = await supabaseAdmin
    .from('test_results')
    .select('domain, score, time_taken_seconds, completed_at')
    .eq('user_email', session.user.email)
    .order('completed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
  }

  return NextResponse.json({ results: results ?? [] })
}

export async function POST(req: NextRequest) {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

  let body: SubmitResultPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { domain, score, time_taken_seconds, answers } = body

  if (!VALID_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }
  if (typeof score !== 'number' || score < 0 || score > 10) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }
  if (typeof time_taken_seconds !== 'number' || time_taken_seconds <= 0) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }

  // Verify answers server-side against the actual correct answers
  const questionIds = Object.keys(answers)

  if (questionIds.length !== MAX_QUESTIONS_PER_TEST) {
    return NextResponse.json({ error: 'Invalid number of answers' }, { status: 400 })
  }
  const { data: questions, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('id, correct_answer')
    .in('id', questionIds)

  if (fetchError || !questions) {
    return NextResponse.json({ error: 'Failed to verify answers' }, { status: 500 })
  }

  const verifiedScore = questions.reduce((count, q) => {
    return answers[q.id] === q.correct_answer ? count + 1 : count
  }, 0)

  // Guard against duplicate submissions (double-clicks, network retries, or the
  // timer/manual-submit race) reaching the database as two separate rows. If a
  // result for this user+domain was already recorded within the last few
  // seconds, treat this request as a duplicate and hand back that result
  // instead of inserting a second row.
  const dedupWindowStart = new Date(
    Date.now() - DUPLICATE_SUBMISSION_WINDOW_SECONDS * 1000
  ).toISOString()
  const { data: recentResults, error: recentError } = await supabaseAdmin
    .from('test_results')
    .select('score')
    .eq('user_email', session.user.email)
    .eq('domain', domain)
    .gte('completed_at', dedupWindowStart)
    .order('completed_at', { ascending: false })
    .limit(1)

  if (!recentError && recentResults && recentResults.length > 0) {
    return NextResponse.json({ score: recentResults[0].score })
  }

  const { error: insertError } = await supabaseAdmin.from('test_results').insert({
    user_id: session.user.id ?? session.user.email,
    user_email: session.user.email,
    domain,
    score: verifiedScore,
    time_taken_seconds,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
  }

  return NextResponse.json({ score: verifiedScore })
}
