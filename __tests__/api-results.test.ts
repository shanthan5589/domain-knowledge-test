/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/results/route'

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

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Exactly MAX_QUESTIONS_PER_TEST (10) answers, matching the real quiz shape.
const validPayload = {
  domain: 'devops',
  score: 0,
  time_taken_seconds: 120,
  answers: {
    'q-1': 'B',
    'q-2': 'A',
    'q-3': 'C',
    'q-4': 'A',
    'q-5': 'B',
    'q-6': 'C',
    'q-7': 'D',
    'q-8': 'A',
    'q-9': 'B',
    'q-10': 'C',
  },
}

const mockDbQuestions = [
  { id: 'q-1', correct_answer: 'B' },
  { id: 'q-2', correct_answer: 'A' },
  { id: 'q-3', correct_answer: 'D' }, // 'C' was submitted → wrong
  { id: 'q-4', correct_answer: 'A' },
  { id: 'q-5', correct_answer: 'B' },
  { id: 'q-6', correct_answer: 'C' },
  { id: 'q-7', correct_answer: 'D' },
  { id: 'q-8', correct_answer: 'A' },
  { id: 'q-9', correct_answer: 'B' },
  { id: 'q-10', correct_answer: 'D' }, // 'C' was submitted → wrong
]

// Mocks the "no recent duplicate" dedup-check lookup (empty result).
function mockNoDuplicate() {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }),
  }
}

describe('POST /api/results', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, domain: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for score out of range', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, score: 11 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative score', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, score: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const req = new NextRequest('http://localhost/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calculates server-side score and returns it', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
    // Mock questions fetch
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
      }),
    })
    // Mock dedup check (no recent duplicate)
    mockFrom.mockReturnValueOnce(mockNoDuplicate())
    // Mock insert
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    // q-1: B=B ✓, q-2: A=A ✓, q-3: C≠D ✗, q-4..q-9 ✓ (6 more), q-10: C≠D ✗ → score = 8
    expect(body.score).toBe(8)
  })

  it('returns 500 when question fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })

  it('returns 500 when insert fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
      }),
    })
    mockFrom.mockReturnValueOnce(mockNoDuplicate())
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })

  it('returns 400 for negative time_taken_seconds', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: -5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for zero time_taken_seconds (instant fabricated completion)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when answers field is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const { answers: _, ...noAnswers } = validPayload
    const res = await POST(makeRequest(noAnswers))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid answers')
  })

  it('returns 400 when answers is not an object', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, answers: 'not-an-object' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid answers')
  })

  it('returns 400 when answers is an array', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, answers: ['A', 'B'] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid answers')
  })

  describe('exact question count enforcement', () => {
    it('returns 400 when fewer than 10 answers are submitted', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
      const fewAnswers = { 'q-1': 'B', 'q-2': 'A' }
      const res = await POST(makeRequest({ ...validPayload, answers: fewAnswers }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Invalid number of answers')
    })

    it('returns 400 when more than 10 answers are submitted', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
      const tooMany = { ...validPayload.answers, 'q-11': 'A' }
      const res = await POST(makeRequest({ ...validPayload, answers: tooMany }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Invalid number of answers')
    })

    it('accepts exactly 10 answers', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
        }),
      })
      mockFrom.mockReturnValueOnce(mockNoDuplicate())
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })
      const res = await POST(makeRequest(validPayload))
      expect(res.status).toBe(200)
    })
  })

  describe('duplicate submission protection', () => {
    it('returns the existing score without inserting a new row when a recent duplicate exists', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
        }),
      })
      // Dedup check finds a recent existing result
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [{ score: 8 }], error: null }),
                }),
              }),
            }),
          }),
        }),
      })
      // Insert is intentionally left unmocked — if the route reached it despite
      // finding a duplicate, calling supabaseAdmin.from() a 3rd time here would
      // throw (mockFrom has no more queued values), failing this test.

      const res = await POST(makeRequest(validPayload))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.score).toBe(8)
    })

    it('inserts normally when no recent duplicate exists', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
        }),
      })
      mockFrom.mockReturnValueOnce(mockNoDuplicate())
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValueOnce({ insert: insertMock })

      const res = await POST(makeRequest(validPayload))
      expect(res.status).toBe(200)
      expect(insertMock).toHaveBeenCalledTimes(1)
    })
  })
})
