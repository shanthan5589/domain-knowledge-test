import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { SubmitResultPayload } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { isRateLimited } from '@/lib/rate-limit'

// Every test consists of exactly this many questions — enforce it exactly so a
// crafted request can't submit fewer (easier, cherry-picked) questions to
// inflate the resulting percentage score.
const MAX_QUESTIONS_PER_TEST = 10

// Hard ceiling on recorded time — matches the 5-minute quiz clock.
const QUIZ_DURATION_SECONDS = 300
// How much less than actual wall-clock elapsed the client may claim, to
// account for the mid-quiz interstitial pause (where the timer is frozen but
// wall-clock advances). Also acts as the outer bound on legit wall-clock
// elapsed. Kept in sync with the same constant in app/api/questions/[domain]/route.ts.
const MAX_PAUSE_GRACE_SECONDS = 120

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

  try {
    if (await isRateLimited(req, 'quiz-submit', 30, 3600, session.user.email)) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to submit result' }, { status: 503 })
  }

  let body: SubmitResultPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { domain, attempt_id, answers, time_taken_seconds: clientTimeClaim } = body

  if (!VALID_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }
  if (typeof attempt_id !== 'string' || !attempt_id) {
    return NextResponse.json({ error: 'Invalid quiz attempt' }, { status: 400 })
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }

  // The questions endpoint issues this record before returning questions. It
  // fixes the domain and question set, and it provides the authoritative
  // server-side start/expiry time.
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('quiz_attempts')
    .select('id, domain, question_ids, started_at, expires_at, completed_at')
    .eq('id', attempt_id)
    .eq('user_email', session.user.email)
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Invalid quiz attempt' }, { status: 400 })
  }
  if (attempt.completed_at) {
    const { data: existing } = await supabaseAdmin
      .from('test_results')
      .select('score')
      .eq('quiz_attempt_id', attempt_id)
      .single()
    return existing
      ? NextResponse.json({ score: existing.score })
      : NextResponse.json({ error: 'Quiz attempt was already completed' }, { status: 409 })
  }
  if (attempt.domain !== domain || new Date(attempt.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Quiz attempt has expired' }, { status: 400 })
  }

  // Verify answers against exactly the questions in this issued attempt.
  const questionIds = Object.keys(answers)

  if (questionIds.length !== MAX_QUESTIONS_PER_TEST) {
    return NextResponse.json({ error: 'Invalid number of answers' }, { status: 400 })
  }
  // Every supplied answer must correspond to one of the exact 10 IDs the
  // attempt was issued for. Object.keys already guarantees uniqueness, so a
  // Set-membership pass over the attempt's IDs is enough — no need to sort
  // both arrays.
  const expectedQuestionIds = attempt.question_ids as string[]
  const expectedIdSet = new Set(expectedQuestionIds)
  if (
    expectedQuestionIds.length !== MAX_QUESTIONS_PER_TEST ||
    questionIds.some((id) => !expectedIdSet.has(id))
  ) {
    return NextResponse.json({ error: 'Answers do not match this quiz attempt' }, { status: 400 })
  }

  const { data: questions, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('id, correct_answer')
    .in('id', questionIds)
    .eq('domain', domain)

  if (fetchError || !questions || questions.length !== MAX_QUESTIONS_PER_TEST) {
    return NextResponse.json({ error: 'Failed to verify answers' }, { status: 500 })
  }

  const verifiedScore = questions.reduce((count, q) => {
    return answers[q.id] === q.correct_answer ? count + 1 : count
  }, 0)

  // Recorded quiz time — the client sends its own elapsed measurement (already
  // reduced by any paused / interstitial-open time), and the server sanity-
  // checks it against wall-clock so a caller can't fabricate an absurdly fast
  // completion. Clamp order:
  //   * upper bound: actual wall-clock elapsed (can't have taken longer)
  //   * lower bound: wall-clock elapsed minus the pause grace budget (can't
  //     have taken meaningfully less than possible either — this is what
  //     stops someone from POSTing time_taken_seconds: 0)
  //   * final cap: QUIZ_DURATION_SECONDS (the 5-minute quiz ceiling)
  const wallClockSeconds = Math.max(
    0,
    Math.ceil((Date.now() - new Date(attempt.started_at).getTime()) / 1000)
  )
  const validClientClaim =
    typeof clientTimeClaim === 'number' && Number.isFinite(clientTimeClaim) && clientTimeClaim >= 0
      ? Math.floor(clientTimeClaim)
      : null
  const claim = validClientClaim ?? wallClockSeconds
  const allowedMin = Math.max(0, wallClockSeconds - MAX_PAUSE_GRACE_SECONDS)
  const clamped = Math.max(allowedMin, Math.min(wallClockSeconds, claim))
  const timeTakenSeconds = Math.min(QUIZ_DURATION_SECONDS, clamped)

  const { error: insertError } = await supabaseAdmin.from('test_results').insert({
    user_id: session.user.id ?? session.user.email,
    user_email: session.user.email,
    domain,
    score: verifiedScore,
    time_taken_seconds: timeTakenSeconds,
    quiz_attempt_id: attempt_id,
  })

  if (insertError) {
    // The unique quiz_attempt_id constraint gives concurrent retries durable
    // idempotency instead of relying on a read-then-write time window.
    const { data: existing } = await supabaseAdmin
      .from('test_results')
      .select('score')
      .eq('quiz_attempt_id', attempt_id)
      .single()
    if (existing) return NextResponse.json({ score: existing.score })
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
  }

  const { error: completeError } = await supabaseAdmin
    .from('quiz_attempts')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', attempt_id)
    .is('completed_at', null)
  if (completeError) {
    console.error('[POST /api/results] Failed to mark quiz attempt completed:', completeError.message)
  }

  return NextResponse.json({ score: verifiedScore })
}
