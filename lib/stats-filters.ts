import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Query params that narrow the comparison crowd down to a subset of profiles.
// Shared across the stats endpoints so the histogram, domain overview, and
// leaderboard all filter the crowd identically.
//
// This is an explicit whitelist: only these exact param -> column pairs are
// ever passed to `.eq()`. Nothing derived from user input (e.g. an arbitrary
// query param name) is ever used as a column name.
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
  // A filter only counts as "active" when its value is present, non-empty (after
  // trimming), and not the "all" sentinel. Skipping missing/blank values here
  // prevents an empty-string param from being passed to `.eq()`, where its
  // matching behavior against NULL/empty columns would be surprising.
  const activeFilters = FILTERABLE_PROFILE_COLUMNS
    .map(([param, column]) => {
      const rawValue = req.nextUrl.searchParams.get(param)
      const value = rawValue?.trim()
      return { param, column, value }
    })
    .filter(({ value }) => !!value && value !== 'all')

  if (activeFilters.length === 0) {
    return { emailFilter: null, error: false }
  }

  let profileQuery = supabaseAdmin.from('profiles').select('email')
  for (const { column, value } of activeFilters) {
    profileQuery = profileQuery.eq(column, value as string)
  }

  const { data: profiles, error } = await profileQuery
  if (error) {
    return { emailFilter: null, error: true }
  }

  return { emailFilter: new Set((profiles ?? []).map((p: { email: string }) => p.email)), error: false }
}
