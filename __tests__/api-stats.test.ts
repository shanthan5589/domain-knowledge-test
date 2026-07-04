/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/stats/route'

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
  return new NextRequest(`http://localhost/api/stats${query}`)
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

// The real profiles query chains .eq() once per active filter before being awaited,
// so the mock builder must stay chainable and thenable across any number of calls.
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

describe('GET /api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when domain is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const res = await GET(makeRequest('?domain=invalid'))
    expect(res.status).toBe(400)
  })

  it('builds a histogram from each user\'s latest score, unfiltered', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 8, completed_at: '2026-01-02' },
      { user_email: 'a@test.com', score: 5, completed_at: '2026-01-01' }, // older attempt, ignored
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalUsers).toBe(3)
    expect(body.histogram[8]).toBe(2)
    expect(body.histogram[10]).toBe(1)
    expect(body.yourScore).toBe(10)
  })

  it('filters the crowd by designation but still reports your own score', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }])

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.histogram[8]).toBe(1)
    expect(body.histogram[6]).toBe(0)
    expect(body.yourScore).toBe(10)
  })

  it('returns yourScore null when the current user has no attempt for the domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.yourScore).toBeNull()
    expect(body.percentile).toBeNull()
  })

  it('computes percentile as the share of the crowd scored lower than you', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 4, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 9, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-01' },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    // 2 of 4 users (a, b) scored below 8 → 50th percentile
    expect(body.percentile).toBe(50)
  })

  it('combines multiple profile filters with AND semantics', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    const builder = makeChainableResult([{ email: 'a@test.com' }])
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue(builder) })

    const res = await GET(
      makeRequest('?domain=ai&designation=Data%20Scientist&country=India&experience=3-5%20years')
    )
    expect(res.status).toBe(200)
    // one .eq() call per active filter (designation, country, experience)
    expect(builder.eq).toHaveBeenCalledTimes(3)
    expect(builder.eq).toHaveBeenCalledWith('designation', 'Data Scientist')
    expect(builder.eq).toHaveBeenCalledWith('country', 'India')
    expect(builder.eq).toHaveBeenCalledWith('years_of_experience', '3-5 years')
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.histogram[8]).toBe(1)
  })

  it('returns 500 when the test_results fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profiles fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])
    mockProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    expect(res.status).toBe(500)
  })
})
