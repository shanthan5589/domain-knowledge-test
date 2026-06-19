import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import type { Domain, Question, ClientQuestion } from '@/lib/types'

const VALID_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // Shuffle and take 10
  const shuffled = (data as Question[]).sort(() => Math.random() - 0.5).slice(0, 10)

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
