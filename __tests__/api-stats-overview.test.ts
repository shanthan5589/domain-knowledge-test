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

function makeRequest() {
  return new NextRequest('http://localhost/api/stats/overview')
}

function mockResultsQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data, error }),
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
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.averageScoreByDomain.ai).toBe(8) // (9 + 7) / 2
    expect(body.averageScoreByDomain.cloud).toBe(5)
    expect(body.attemptCounts.ai).toBe(2)
    expect(body.attemptCounts.cloud).toBe(1)
  })

  it('picks the domain with the most unique test-takers as most attempted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { domain: 'ai', user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' },
      { domain: 'ai', user_email: 'b@test.com', score: 7, completed_at: '2026-01-03' },
      { domain: 'ai', user_email: 'c@test.com', score: 5, completed_at: '2026-01-02' },
      { domain: 'cloud', user_email: 'a@test.com', score: 5, completed_at: '2026-01-01' },
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.mostAttemptedDomain).toBe('ai')
  })
})
