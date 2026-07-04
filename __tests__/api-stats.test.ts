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

function mockProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data, error }),
    }),
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
