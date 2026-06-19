/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/questions/[domain]/route'

// Mock auth
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

// Mock supabaseAdmin
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
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

const mockQuestions = Array.from({ length: 50 }, (_, i) => ({
  id: `id-${i}`,
  domain: 'devops',
  question: `Question ${i}`,
  option_a: `A${i}`,
  option_b: `B${i}`,
  option_c: `C${i}`,
  option_d: `D${i}`,
  correct_answer: 'B',
}))

describe('GET /api/questions/[domain]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await GET(makeRequest('invalid'), makeParams('invalid'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid domain')
  })

  it('returns 10 questions for a valid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockQuestions, error: null }),
      }),
    })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.questions).toHaveLength(10)
  })

  it('strips correct_answer from returned questions', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockQuestions, error: null }),
      }),
    })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    const body = await res.json()
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('correct_answer')
    }
  })

  it('returned questions have required fields', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: mockQuestions, error: null }),
      }),
    })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
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

  it('returns 500 when Supabase returns an error', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    const res = await GET(makeRequest('devops'), makeParams('devops'))
    expect(res.status).toBe(500)
  })

  it('accepts all 5 valid domains', async () => {
    const domains = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']
    for (const domain of domains) {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockQuestions, error: null }),
        }),
      })
      const res = await GET(makeRequest(domain), makeParams(domain))
      expect(res.status).toBe(200)
    }
  })
})
