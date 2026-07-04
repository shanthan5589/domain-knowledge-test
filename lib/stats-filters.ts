import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Query params that narrow the comparison crowd down to a subset of profiles.
// Shared across the stats endpoints so the histogram, domain overview, and
// leaderboard all filter the crowd identically.
const FILTERABLE_PROFILE_COLUMNS = [
  ['designation', 'designation'],
  ['country', 'country'],
  ['state_region', 'state_region'],
  ['city', 'city'],
  ['experience', 'years_of_experience'],
] as const

interface EmailFilterResult {
  emailFilter: Set<string> | null
  error: boolean
}

// Resolves the active filter query params into the set of profile emails that match
// all of them (AND semantics). Returns emailFilter: null when no filters are active,
// meaning "everyone" — callers should treat that as "don't restrict the crowd".
export async function resolveEmailFilter(req: NextRequest): Promise<EmailFilterResult> {
  const activeFilters = FILTERABLE_PROFILE_COLUMNS.filter(([param]) => {
    const value = req.nextUrl.searchParams.get(param)
    return value && value !== 'all'
  })

  if (activeFilters.length === 0) {
    return { emailFilter: null, error: false }
  }

  let profileQuery = supabaseAdmin.from('profiles').select('email')
  for (const [param, column] of activeFilters) {
    profileQuery = profileQuery.eq(column, req.nextUrl.searchParams.get(param) as string)
  }

  const { data: profiles, error } = await profileQuery
  if (error) {
    return { emailFilter: null, error: true }
  }

  return { emailFilter: new Set((profiles ?? []).map((p: { email: string }) => p.email)), error: false }
}
