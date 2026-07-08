// lib/stats-filters.ts also exports resolveEmailFilter, which imports
// supabase-server at module load time — mock it so this pure-function test
// doesn't need real Supabase env vars.
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

import { matchesEmailFilter } from '@/lib/stats-filters'

describe('lib/stats-filters matchesEmailFilter', () => {
  it('returns true for any email when the filter is null (no active filters)', () => {
    expect(matchesEmailFilter(null, 'a@example.com')).toBe(true)
    expect(matchesEmailFilter(null, 'anyone@example.com')).toBe(true)
  })

  it('returns true when the email is present in the filter set', () => {
    const emailFilter = new Set(['a@example.com', 'b@example.com'])
    expect(matchesEmailFilter(emailFilter, 'a@example.com')).toBe(true)
  })

  it('returns false when the email is absent from the filter set', () => {
    const emailFilter = new Set(['a@example.com'])
    expect(matchesEmailFilter(emailFilter, 'b@example.com')).toBe(false)
  })

  it('returns false for any email when the filter set is empty', () => {
    const emailFilter = new Set<string>()
    expect(matchesEmailFilter(emailFilter, 'a@example.com')).toBe(false)
  })
})
