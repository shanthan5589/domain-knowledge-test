/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/stats/leaderboard/route'

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

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/stats/leaderboard${query}`)
}

function mockResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  })
}

function mockProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ data, error }),
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

function mockFilterProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue(makeChainableResult(data, error)),
  })
}

describe('GET /api/stats/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const res = await GET(makeRequest('?domain=invalid'))
    expect(res.status).toBe(400)
  })

  it('returns an empty leaderboard when nobody has attempted the domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([])
    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.leaderboard).toEqual([])
  })

  it('ranks by score descending, using each user\'s latest attempt', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 6, completed_at: '2026-01-04' },
      { user_email: 'a@test.com', score: 9, completed_at: '2026-01-01' }, // older, ignored
      { user_email: 'b@test.com', score: 10, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-02' },
    ])
    mockProfilesQuery([
      { email: 'a@test.com', full_name: 'Alice' },
      { email: 'b@test.com', full_name: 'Bob' },
      { email: 'me@test.com', full_name: 'Me' },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.leaderboard).toEqual([
      { name: 'Bob', score: 10, isYou: false },
      { name: 'Me', score: 8, isYou: true },
      { name: 'Alice', score: 6, isYou: false },
    ])
  })

  it('breaks ties by earliest completion time', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-05' },
      { user_email: 'b@test.com', score: 8, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery([
      { email: 'a@test.com', full_name: 'Alice' },
      { email: 'b@test.com', full_name: 'Bob' },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.leaderboard.map((r: { name: string }) => r.name)).toEqual(['Bob', 'Alice'])
  })

  it('respects the limit query param, capped at 20', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const rows = Array.from({ length: 30 }, (_, i) => ({
      user_email: `u${i}@test.com`,
      score: i % 11,
      completed_at: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    }))
    mockResultsQuery(rows)
    mockProfilesQuery(rows.map((r) => ({ email: r.user_email, full_name: r.user_email })))

    const res = await GET(makeRequest('?domain=ai&limit=999'))
    const body = await res.json()
    expect(body.leaderboard).toHaveLength(20)
  })

  it('falls back to Anonymous when a profile has no full_name', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 7, completed_at: '2026-01-01' }])
    mockProfilesQuery([{ email: 'a@test.com', full_name: null }])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.leaderboard[0].name).toBe('Anonymous')
  })

  it('ignores results whose profile has been deleted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'deleted@test.com', score: 10, completed_at: '2026-01-01' },
      { user_email: 'a@test.com', score: 7, completed_at: '2026-01-02' },
    ])
    mockProfilesQuery([{ email: 'a@test.com', full_name: 'Alice' }])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.leaderboard).toEqual([
      { name: 'Alice', score: 7, isYou: false },
    ])
  })

  it('restricts the leaderboard to the profile filter when one is supplied', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 10, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-01' },
    ])
    // Only 'a' and 'me' match the designation filter — 'b' (the top scorer) is excluded
    mockFilterProfilesQuery([{ email: 'a@test.com' }, { email: 'me@test.com' }])
    mockProfilesQuery([
      { email: 'a@test.com', full_name: 'Alice' },
      { email: 'me@test.com', full_name: 'Me' },
    ])

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.leaderboard).toEqual([
      { name: 'Me', score: 8, isYou: true },
      { name: 'Alice', score: 6, isYou: false },
    ])
  })

  it('returns an empty leaderboard when the profile filter matches nobody who has attempted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 6, completed_at: '2026-01-01' }])
    mockFilterProfilesQuery([])

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.leaderboard).toEqual([])
  })

  it('returns 500 when the profile filter fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 6, completed_at: '2026-01-01' }])
    mockFilterProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the test_results fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profiles fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 7, completed_at: '2026-01-01' }])
    mockProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profiles fetch returns no data', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 7, completed_at: '2026-01-01' }])
    mockProfilesQuery(null)
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })
})
