import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain, ClientQuestion } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'
import { isRateLimited } from '@/lib/rate-limit'

const QUESTION_COUNT = 10
const QUIZ_DURATION_SECONDS = 300
// Extra grace budget on top of the 5-minute quiz clock so that time the user
// spends on the mid-quiz interstitial (or any other pause we add later) does
// not blow through expires_at while their client-side timer is still frozen.
// Kept modest (2 min) so a tab left open indefinitely still eventually
// expires. Must stay in sync with the same constant in app/api/results/route.ts.
const MAX_PAUSE_GRACE_SECONDS = 120

// Unbiased shuffle: Array.prototype.sort(() => Math.random() - 0.5) is a well-known
// non-uniform shuffle because comparator-based sorts don't produce a fair permutation.
// Fisher-Yates guarantees every permutation is equally likely.
function fisherYatesShuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { session, unauthorizedResponse } = await requireSession()
  if (!session) return unauthorizedResponse

  try {
    if (await isRateLimited(_req, 'quiz-start', 20, 3600, session.user.email)) {
      return NextResponse.json({ error: 'Too many quiz attempts. Please try again later.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to start quiz' }, { status: 503 })
  }

  const { domain } = await params

  if (!VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  // Fetch every question in the pool for this domain, then pick 10 server-
  // side. Only the columns the response actually needs — dropping `domain`
  // (already filtered on) and `correct_answer` (unused in this handler and
  // stripped before response) keeps ~50 correct-answer letters out of app
  // memory per quiz start, and shrinks the row over the wire.
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('id, question, option_a, option_b, option_c, option_d')
    .eq('domain', domain)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  if (!data || data.length < QUESTION_COUNT) {
    return NextResponse.json({ error: 'Not enough questions are available for this domain' }, { status: 503 })
  }

  // Shuffle using Fisher-Yates (unbiased) and bind these exact IDs to a
  // server-side, expiring quiz attempt before exposing them to the client.
  const shuffled = fisherYatesShuffle(data as ClientQuestion[]).slice(0, QUESTION_COUNT)
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('quiz_attempts')
    .insert({
      user_email: session.user.email,
      domain,
      question_ids: shuffled.map((question) => question.id),
      expires_at: new Date(
        Date.now() + (QUIZ_DURATION_SECONDS + MAX_PAUSE_GRACE_SECONDS) * 1000
      ).toISOString(),
    })
    .select('id')
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Unable to start quiz' }, { status: 500 })
  }

  // Strip correct_answer before sending to client
  const clientQuestions: ClientQuestion[] = shuffled.map(({ id, question, option_a, option_b, option_c, option_d }) => ({
    id,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
  }))

  return NextResponse.json({ attemptId: attempt.id, questions: clientQuestions })
}
