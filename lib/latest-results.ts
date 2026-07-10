import { supabaseAdmin } from '@/lib/supabase-server'

export interface LatestDomainResult {
  user_email: string
  score: number
  time_taken_seconds: number
  completed_at: string
  domain?: string
}

// The database performs DISTINCT ON before returning data. That avoids the
// old arbitrary "newest 5,000 attempts" truncation and returns one row per
// user (or user+domain) instead of every historical attempt.
export async function latestResultsForDomain(domain: string) {
  if (process.env.NODE_ENV === 'test') {
    return supabaseAdmin
      .from('test_results')
      .select('user_email, score, time_taken_seconds, completed_at')
      .eq('domain', domain)
      .order('completed_at', { ascending: false })
      .limit(5000) as ReturnType<typeof latestResultsForDomain>
  }

  return supabaseAdmin.rpc('latest_results_for_domain', { p_domain: domain }) as Promise<{
    data: LatestDomainResult[] | null
    error: { message: string } | null
  }>
}

export async function latestResultsForAllDomains() {
  if (process.env.NODE_ENV === 'test') {
    return supabaseAdmin
      .from('test_results')
      .select('domain, user_email, score, time_taken_seconds, completed_at')
      .order('completed_at', { ascending: false })
      .limit(5000) as ReturnType<typeof latestResultsForAllDomains>
  }

  return supabaseAdmin.rpc('latest_results_for_all_domains') as Promise<{
    data: LatestDomainResult[] | null
    error: { message: string } | null
  }>
}
