import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { SubmitResultPayload, Domain } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

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
  if (typeof score !== 'number' || score < 0 || score > 10) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }
  if (typeof time_taken_seconds !== 'number' || time_taken_seconds < 0) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }

  // Verify answers server-side against the actual correct answers
  const questionIds = Object.keys(answers)
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
