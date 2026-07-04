import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { SubmitResultPayload, Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']
const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D'])
const MAX_QUESTIONS_PER_TEST = 10
const MAX_TIME_TAKEN_SECONDS = 300

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
  if (!Number.isInteger(score) || score < 0 || score > MAX_QUESTIONS_PER_TEST) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }
  if (
    !Number.isInteger(time_taken_seconds) ||
    time_taken_seconds < 0 ||
    time_taken_seconds > MAX_TIME_TAKEN_SECONDS
  ) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }

  // Verify answers server-side against the actual correct answers
  const questionIds = Object.keys(answers)
  if (questionIds.length > MAX_QUESTIONS_PER_TEST) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }
  if (!Object.values(answers).every((answer) => VALID_ANSWERS.has(answer))) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  }

  let verifiedScore = 0
  if (questionIds.length > 0) {
    const { data: questions, error: fetchError } = await supabaseAdmin
      .from('questions')
      .select('id, correct_answer')
      .eq('domain', domain)
      .in('id', questionIds)

    if (fetchError || !questions) {
      return NextResponse.json({ error: 'Failed to verify answers' }, { status: 500 })
    }

    verifiedScore = questions.reduce((count, q) => {
      return answers[q.id] === q.correct_answer ? count + 1 : count
    }, 0)
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
