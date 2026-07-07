import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain, Question, ClientQuestion } from '@/lib/types'
import { ALL_DOMAINS as VALID_DOMAINS } from '@/lib/domains'
import { requireSession } from '@/lib/session'

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

  const { domain } = await params

  if (!VALID_DOMAINS.includes(domain as Domain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
  }

  // Fetch all questions for the domain, then randomly pick 10 server-side
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('id, domain, question, option_a, option_b, option_c, option_d, correct_answer')
    .eq('domain', domain)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Shuffle using Fisher-Yates (unbiased) and take 10
  const shuffled = fisherYatesShuffle(data as Question[]).slice(0, 10)

  // Strip correct_answer before sending to client
  const clientQuestions: ClientQuestion[] = shuffled.map(({ id, question, option_a, option_b, option_c, option_d }) => ({
    id,
    question,
    option_a,
    option_b,
    option_c,
    option_d,
  }))

  return NextResponse.json({ questions: clientQuestions })
}
