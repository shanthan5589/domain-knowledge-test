/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/stats/overview/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const mockAuth = auth as jest.Mock
const mockFrom = supabaseAdmin.from as jest.Mock

function makeRequest(query = '') {
  return new NextRequest(`http://localhost/api/stats/overview${query}`)
}

// The cross-domain results query no longer chains .in('domain', ...) —
// the route delegates to latestResultsForAllDomains, which is a Postgres
// RPC in production and .select().order().limit() in test env (with the
// domain filter dropped, since the caller wants every domain anyway).
function mockResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  })
}

// resolveEmailFilter's profiles query chains .eq() once per active filter before
// being awaited, so the mock builder must stay chainable and thenable.
function makeChainableResult(data: unknown, error: unknown = null) {
  const builder: {
    eq: jest.Mock
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => void
  } = {
    eq: jest.fn(() => builder),
    then: (resolve) => resolve({ data, error }),
  }
  return builder
}

function mockProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue(makeChainableResult(data, error)),
  })
}

function mockExistingProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ data, error }),
    }),
  })
}

function emails(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}@test.com`)
}

describe('GET /api/stats/overview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 500 when the fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns null averages and no most-attempted domain when there is no data', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBeNull()
    expect(body.mostAttemptedDomain).toBeNull()
  })

  it('computes per-domain averages from each user\'s latest attempt only, once the cohort meets the minimum size', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const aiEmails = emails('ai', 5)
    const cloudEmails = emails('cloud', 5)
    mockResultsQuery([
      ...aiEmails.map((email, i) => ({ domain: 'ai', user_email: email, score: 9, completed_at: `2026-01-${10 + i}` })),
      { domain: 'ai', user_email: aiEmails[0], score: 3, completed_at: '2026-01-01' }, // older, ignored
      ...cloudEmails.map((email, i) => ({ domain: 'cloud', user_email: email, score: 5, completed_at: `2026-02-${10 + i}` })),
    ])
    mockExistingProfilesQuery([...aiEmails, ...cloudEmails].map((email) => ({ email })))
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBe(9)
    expect(body.averageScoreByDomain.cloud).toBe(5)
    expect(body.attemptCounts.ai).toBe(5)
    expect(body.attemptCounts.cloud).toBe(5)
  })

  it('suppresses the domain average (but not the raw attempt count) when fewer than the minimum cohort size have attempted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'a@test.com', score: 3, completed_at: '2026-01-01' }, // older, ignored
      { domain: 'ai', user_email: 'b@test.com', score: 7, completed_at: '2026-01-02' },
      { domain: 'cloud', user_email: 'a@test.com', score: 5, completed_at: '2026-01-03' },
    ])
    mockExistingProfilesQuery([{ email: 'a@test.com' }, { email: 'b@test.com' }])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBeNull()
    expect(body.averageScoreByDomain.cloud).toBeNull()
    expect(body.attemptCounts.ai).toBe(2)
    expect(body.attemptCounts.cloud).toBe(1)
  })

  it('returns the current user latest, best, and attempt count by domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'me@test.com', score: 8, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'me@test.com', score: 10, completed_at: '2026-01-03' },
      { domain: 'cloud', user_email: 'me@test.com', score: 6, completed_at: '2026-01-02' },
      { domain: 'ai', user_email: 'a@test.com', score: 7, completed_at: '2026-01-01' },
    ])
    mockExistingProfilesQuery([{ email: 'me@test.com' }, { email: 'a@test.com' }])

    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.userLatestScoreByDomain.ai).toBe(8)
    expect(body.userBestScoreByDomain.ai).toBe(10)
    expect(body.userAttemptCountsByDomain.ai).toBe(2)
    expect(body.userLatestScoreByDomain.cloud).toBe(6)
  })

  it('picks the domain with the most unique test-takers as most attempted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'b@test.com', score: 7, completed_at: '2026-01-03' },
      { domain: 'ai', user_email: 'c@test.com', score: 5, completed_at: '2026-01-02' },
      { domain: 'cloud', user_email: 'a@test.com', score: 5, completed_at: '2026-01-01' },
    ])
    mockExistingProfilesQuery([{ email: 'a@test.com' }, { email: 'b@test.com' }, { email: 'c@test.com' }])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.mostAttemptedDomain).toBe('ai')
  })

  it('restricts averages to the profile filter when one is supplied, once the filtered cohort meets the minimum size', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const aEmails = emails('a', 5)
    mockResultsQuery([
      ...aEmails.map((email, i) => ({ domain: 'ai', user_email: email, score: 9, completed_at: `2026-01-${10 + i}` })),
      { domain: 'ai', user_email: 'b@test.com', score: 3, completed_at: '2026-01-03' },
      ...aEmails.map((email, i) => ({ domain: 'cloud', user_email: email, score: 6, completed_at: `2026-02-${10 + i}` })),
    ])
    mockProfilesQuery(aEmails.map((email) => ({ email })))

    const res = await GET(makeRequest('?designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBe(9)
    expect(body.attemptCounts.ai).toBe(5)
    expect(body.averageScoreByDomain.cloud).toBe(6)
  })

  it('ignores results whose profile has been deleted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'deleted@test.com', score: 10, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'a@test.com', score: 6, completed_at: '2026-01-03' },
      { domain: 'cloud', user_email: 'deleted@test.com', score: 9, completed_at: '2026-01-02' },
    ])
    mockExistingProfilesQuery([{ email: 'a@test.com' }])

    const res = await GET(makeRequest())
    const body = await res.json()
    // Only 1 real (non-deleted) test-taker per domain — below the minimum
    // cohort size, so averages are suppressed even though attempt counts and
    // the most-attempted domain are still reported.
    expect(body.averageScoreByDomain.ai).toBeNull()
    expect(body.attemptCounts.ai).toBe(1)
    expect(body.averageScoreByDomain.cloud).toBeNull()
    expect(body.mostAttemptedDomain).toBe('ai')
  })

  it('returns 500 when the profile existence fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' }])
    mockExistingProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profile filter fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' }])
    mockProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?designation=Data%20Scientist'))
    expect(res.status).toBe(500)
  })
})
