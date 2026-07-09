/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/stats/personal/route'

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
  return new NextRequest(`http://localhost/api/stats/personal${query}`)
}

// The user's own attempts query: .select().eq('user_email', ...).order().limit()
function mockMyResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  })
}

// The cross-domain crowd query: .select().in('domain', ...).order().limit()
function mockCrowdResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data, error }),
        }),
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

function profileRow(email: string, overrides: Partial<Record<string, string>> = {}) {
  return {
    email,
    designation: 'Software Engineer / Developer',
    years_of_experience: '1-3 years',
    country: 'India',
    state_region: 'Telangana',
    city: 'Hyderabad',
    ...overrides,
  }
}

describe('GET /api/stats/personal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 500 when the personal results fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns 500 when the crowd results fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery([{ user_email: 'me@test.com', score: 7, time_taken_seconds: 240, completed_at: '2026-01-01T00:00:00Z', domain: 'ai' }])
    mockCrowdResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profiles fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery([{ user_email: 'me@test.com', score: 7, time_taken_seconds: 240, completed_at: '2026-01-01T00:00:00Z', domain: 'ai' }])
    mockCrowdResultsQuery([{ user_email: 'me@test.com', score: 7, time_taken_seconds: 240, completed_at: '2026-01-01T00:00:00Z', domain: 'ai' }])
    mockProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
  })

  it('builds activity calendar, streaks, pace points, and domain ranges from the user\'s own attempts across all domains', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
      { user_email: 'me@test.com', score: 6, time_taken_seconds: 250, completed_at: '2026-01-02T09:00:00Z', domain: 'cloud' },
    ])
    mockCrowdResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
      { user_email: 'me@test.com', score: 6, time_taken_seconds: 250, completed_at: '2026-01-02T09:00:00Z', domain: 'cloud' },
    ])
    mockProfilesQuery([profileRow('me@test.com')])

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.activityCalendar).toEqual([
      { date: '2026-01-02', count: 1 },
      { date: '2026-01-03', count: 1 },
    ])
    expect(body.domainRanges).toEqual(
      expect.arrayContaining([
        { domain: 'ai', min: 8, max: 8, mean: 8, count: 1 },
        { domain: 'cloud', min: 6, max: 6, mean: 6, count: 1 },
      ])
    )
    expect(body.pacePoints).toHaveLength(2)
    // 2026-01-02 and 2026-01-03 are consecutive days -> longest streak of 2;
    // current streak is 0 since neither day is "today" at real test-run time.
    expect(body.streaks).toEqual({ currentStreak: 0, longestStreak: 2 })
  })

  it('builds the domain radar from the crowd\'s latest attempt per user per domain, scoped to city/country', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
    ])
    mockCrowdResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
      { user_email: 'a@test.com', score: 6, time_taken_seconds: 200, completed_at: '2026-01-02T09:00:00Z', domain: 'ai' },
      { user_email: 'b@test.com', score: 4, time_taken_seconds: 200, completed_at: '2026-01-01T09:00:00Z', domain: 'ai' },
    ])
    mockProfilesQuery([profileRow('me@test.com'), profileRow('a@test.com'), profileRow('b@test.com')])

    const res = await GET(makeRequest('?city=Hyderabad&country=India'))
    const body = await res.json()
    const aiPoint = body.domainRadar.find((r: { domain: string }) => r.domain === 'ai')
    // city/country cohort is all 3 Hyderabad/India entries: (8+6+4)/3 = 6
    expect(aiPoint).toEqual({ domain: 'ai', you: 8, city: 6, country: 6 })
  })

  it('ignores crowd rows whose profile has been deleted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockMyResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
    ])
    mockCrowdResultsQuery([
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03T09:00:00Z', domain: 'ai' },
      { user_email: 'deleted@test.com', score: 2, time_taken_seconds: 200, completed_at: '2026-01-02T09:00:00Z', domain: 'ai' },
    ])
    mockProfilesQuery([profileRow('me@test.com')])

    const res = await GET(makeRequest('?city=Hyderabad&country=India'))
    const body = await res.json()
    const aiPoint = body.domainRadar.find((r: { domain: string }) => r.domain === 'ai')
    // Only 1 entry (me) has a surviving profile — below MIN_COHORT_SIZE, so city/country are withheld
    expect(aiPoint).toEqual({ domain: 'ai', you: 8, city: null, country: null })
  })
})
