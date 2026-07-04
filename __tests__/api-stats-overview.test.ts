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

function mockResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data, error }),
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

  it('computes per-domain averages from each user\'s latest attempt only', async () => {
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
    expect(body.averageScoreByDomain.ai).toBe(8) // (9 + 7) / 2
    expect(body.averageScoreByDomain.cloud).toBe(5)
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

  it('restricts averages to the profile filter when one is supplied', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'b@test.com', score: 3, completed_at: '2026-01-03' },
      { domain: 'cloud', user_email: 'a@test.com', score: 6, completed_at: '2026-01-02' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }])

    const res = await GET(makeRequest('?designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBe(9)
    expect(body.attemptCounts.ai).toBe(1)
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
    expect(body.averageScoreByDomain.ai).toBe(6)
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
