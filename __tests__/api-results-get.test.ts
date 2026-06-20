/** @jest-environment node */
import { GET } from '@/app/api/results/route'

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

function mockSupabase(data: unknown, error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  }
  mockFrom.mockReturnValue(chain)
  return chain
}

describe('GET /api/results', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty results when user has no history', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockSupabase([])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toEqual([])
  })

  it('returns results for authenticated user', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockSupabase([
      { domain: 'ai', score: 8, time_taken_seconds: 240, completed_at: '2026-06-19T10:00:00Z' },
      { domain: 'cloud', score: 6, time_taken_seconds: 280, completed_at: '2026-06-18T10:00:00Z' },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(2)
    expect(body.results[0].domain).toBe('ai')
    expect(body.results[0].score).toBe(8)
  })

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockSupabase(null, { message: 'db error' })
    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns results as empty array when data is null', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockSupabase(null, null)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toEqual([])
  })
})
