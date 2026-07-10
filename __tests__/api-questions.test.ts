/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/questions/[domain]/route'

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: jest.fn() },
}))

import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const mockAuth = auth as jest.Mock
const mockFrom = supabaseAdmin.from as jest.Mock

function makeRequest(domain: string) {
  return new NextRequest(`http://localhost/api/questions/${domain}`)
}
function makeParams(domain: string) {
  return { params: Promise.resolve({ domain }) }
}

function makeMockPool(size: number, domain = 'ai') {
  return Array.from({ length: size }, (_, i) => ({
    id: `id-${i}`,
    domain,
    question: `Question ${i}?`,
    option_a: `Option A${i}`,
    option_b: `Option B${i}`,
    option_c: `Option C${i}`,
    option_d: `Option D${i}`,
    correct_answer: ['A', 'B', 'C', 'D'][i % 4],
  }))
}

// The route makes two DB calls in order:
//   1. from('questions').select(...).eq('domain', ...)  → returns the pool
//   2. from('quiz_attempts').insert(...).select('id').single()
//         → returns the created attempt row
// Mock both so the route can build a full response.
function mockDB(
  poolData: object[],
  poolError: object | null = null,
  attemptError: object | null = null,
  attemptId = 'attempt-1'
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'questions') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: poolData, error: poolError }),
        }),
      }
    }
    if (table === 'quiz_attempts') {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: attemptError ? null : { id: attemptId }, error: attemptError }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected supabase.from('${table}')`)
  })
}

describe('GET /api/questions/[domain] — auth & validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns 400 for an invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(makeRequest('invalid'), makeParams('invalid'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid domain')
  })

  it('rejects empty domain string', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(makeRequest(''), makeParams(''))
    expect(res.status).toBe(400)
  })

  it('returns 500 when Supabase returns an error fetching the pool', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB([], { message: 'DB error' })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(500)
  })

  it('returns 503 when the pool has fewer than 10 questions', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(5, 'devops'))
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(503)
  })

  it('returns 500 when the quiz_attempts insert fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50, 'devops'), null, { message: 'insert failed' })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/questions/[domain] — accepts all valid domains', () => {
  beforeEach(() => jest.clearAllMocks())

  const domains = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

  it.each(domains)('returns 200 for domain: %s', async (domain) => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50, domain))
    const res = await GET(makeRequest(domain), makeParams(domain))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/questions/[domain] — response shape', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns an attemptId alongside the questions array', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50), null, null, 'attempt-xyz')
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    expect(body.attemptId).toBe('attempt-xyz')
    expect(Array.isArray(body.questions)).toBe(true)
  })

  it('returned questions have all required fields', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50))
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    for (const q of body.questions) {
      expect(q).toHaveProperty('id')
      expect(q).toHaveProperty('question')
      expect(q).toHaveProperty('option_a')
      expect(q).toHaveProperty('option_b')
      expect(q).toHaveProperty('option_c')
      expect(q).toHaveProperty('option_d')
    }
  })

  it('correct_answer is stripped from every returned question', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50))
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('correct_answer')
    }
  })
})

describe('GET /api/questions/[domain] — sampling', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns exactly 10 questions from a pool of 50', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(50))
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    const body = await res.json()
    expect(body.questions).toHaveLength(10)
  })

  it('returns exactly 10 questions from the AI pool of 65', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(65))
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    expect(body.questions).toHaveLength(10)
  })

  it('all 10 returned questions come from the pool (no invented questions)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const pool = makeMockPool(65)
    mockDB(pool)
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    const poolIds = new Set(pool.map((q) => q.id))
    for (const q of body.questions) {
      expect(poolIds.has(q.id)).toBe(true)
    }
  })

  it('returned questions have no duplicates', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB(makeMockPool(65))
    const res = await GET(makeRequest('ai'), makeParams('ai'))
    const body = await res.json()
    const ids = body.questions.map((q: { id: string }) => q.id)
    expect(new Set(ids).size).toBe(10)
  })

  it('shuffles questions — two calls return different order with high probability', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })

    mockDB(makeMockPool(65))
    const res1 = await GET(makeRequest('ai'), makeParams('ai'))
    const ids1 = (await res1.json()).questions.map((q: { id: string }) => q.id)

    mockDB(makeMockPool(65))
    const res2 = await GET(makeRequest('ai'), makeParams('ai'))
    const ids2 = (await res2.json()).questions.map((q: { id: string }) => q.id)

    // With 65 questions choosing 10, same order by pure chance is astronomically unlikely
    expect(ids1.join(',')).not.toBe(ids2.join(','))
  })
})
