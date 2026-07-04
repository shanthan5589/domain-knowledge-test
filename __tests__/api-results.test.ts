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

const validPayload = {
  domain: 'devops',
  score: 0,
  time_taken_seconds: 120,
  answers: { 'q-1': 'B', 'q-2': 'A', 'q-3': 'C' },
}

const mockDbQuestions = [
  { id: 'q-1', correct_answer: 'B' },
  { id: 'q-2', correct_answer: 'A' },
  { id: 'q-3', correct_answer: 'D' }, // 'C' was submitted → wrong
]

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

  it('returns 400 for decimal score', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, score: 5.5 }))
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
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
        }),
      }),
    })
    // Mock insert
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    // q-1: B=B ✓, q-2: A=A ✓, q-3: C≠D ✗ → score = 2
    expect(body.score).toBe(2)
  })

  it('returns 500 when question fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })

  it('returns 500 when insert fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
        }),
      }),
    })
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

  it('returns 400 for decimal time_taken_seconds', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 12.5 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for time_taken_seconds beyond the quiz limit', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 301 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when answers field is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const noAnswers = {
      domain: validPayload.domain,
      score: validPayload.score,
      time_taken_seconds: validPayload.time_taken_seconds,
    }
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

  it('returns 400 when more than 10 answers are submitted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const answers = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`q-${i + 1}`, 'A'])
    )
    const res = await POST(makeRequest({ ...validPayload, answers }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid answers')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('filters verification questions by submitted domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
    const inMock = jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null })
    const eqMock = jest.fn().mockReturnValue({ in: inMock })
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({ eq: eqMock }),
    })
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })

    const res = await POST(makeRequest(validPayload))

    expect(res.status).toBe(200)
    expect(eqMock).toHaveBeenCalledWith('domain', 'devops')
    expect(inMock).toHaveBeenCalledWith('id', ['q-1', 'q-2', 'q-3'])
  })

  it('returns 400 when an answer value is invalid', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({
      ...validPayload,
      answers: { ...validPayload.answers, 'q-1': 'E' },
    }))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid answers')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('saves a zero score when a timed-out quiz submits no answers', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
    const insert = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({ insert })

    const res = await POST(makeRequest({ ...validPayload, answers: {} }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.score).toBe(0)
    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ score: 0 }))
  })
})
