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

const QUESTION_IDS = ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6', 'q-7', 'q-8', 'q-9', 'q-10']

const validPayload = {
  domain: 'devops',
  attempt_id: 'attempt-1',
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

interface AttemptRow {
  id?: string
  domain?: string
  question_ids?: string[]
  started_at?: string
  expires_at?: string
  completed_at?: string | null
}

interface MockDBOptions {
  attempt?: AttemptRow | null
  attemptError?: object | null
  questions?: typeof mockDbQuestions | null
  questionsError?: object | null
  insertError?: object | null
  existingResult?: { score: number } | null
  markCompletedError?: object | null
}

// The results POST touches Supabase in a fixed order:
//   1. quiz_attempts.select(...).eq('id').eq('user_email').single()
//        → load the attempt row
//   2. (only if the attempt was already completed) test_results.select('score')
//        .eq('quiz_attempt_id').single()  → look up the existing score
//   3. questions.select('id, correct_answer').in('id', ...).eq('domain', ...)
//        → fetch correct answers
//   4. test_results.insert(...)                                → save the row
//   5. (only on insert conflict) test_results.select('score').eq(...).single()
//        → return the row that raced us
//   6. quiz_attempts.update({completed_at}).eq('id').is('completed_at', null)
//        → mark the attempt done
function mockDB(opts: MockDBOptions = {}) {
  const attempt =
    opts.attempt === undefined
      ? {
          id: 'attempt-1',
          domain: 'devops',
          question_ids: QUESTION_IDS,
          started_at: new Date(Date.now() - 30_000).toISOString(),
          expires_at: new Date(Date.now() + 300_000).toISOString(),
          completed_at: null,
        }
      : opts.attempt
  const questions = opts.questions === undefined ? mockDbQuestions : opts.questions

  // 1. attempt lookup
  mockFrom.mockImplementationOnce((table: string) => {
    expect(table).toBe('quiz_attempts')
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: attempt, error: opts.attemptError ?? null }),
          }),
        }),
      }),
    }
  })

  // 2. duplicate-completed lookup (only used when attempt.completed_at is set)
  if (attempt && attempt.completed_at) {
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('test_results')
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: opts.existingResult ?? null,
              error: opts.existingResult ? null : { code: 'PGRST116' },
            }),
          }),
        }),
      }
    })
    return
  }

  // 3. questions fetch
  mockFrom.mockImplementationOnce((table: string) => {
    expect(table).toBe('questions')
    return {
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: questions, error: opts.questionsError ?? null }),
        }),
      }),
    }
  })

  // 4. insert
  mockFrom.mockImplementationOnce((table: string) => {
    expect(table).toBe('test_results')
    return {
      insert: jest.fn().mockResolvedValue({ error: opts.insertError ?? null }),
    }
  })

  // 5. only on insert conflict — existing-row lookup
  if (opts.insertError) {
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('test_results')
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: opts.existingResult ?? null,
              error: opts.existingResult ? null : { code: 'PGRST116' },
            }),
          }),
        }),
      }
    })
  }

  // 6. mark attempt completed (only reached on successful insert)
  if (!opts.insertError) {
    mockFrom.mockImplementationOnce((table: string) => {
      expect(table).toBe('quiz_attempts')
      return {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({ error: opts.markCompletedError ?? null }),
          }),
        }),
      }
    })
  }
}

describe('POST /api/results', () => {
  beforeEach(() => {
    // Reset (not just clear) — clearAllMocks leaves the mockImplementationOnce
    // queue intact, and an early-return test (e.g. attempt not found) would
    // leak leftover impls into the next test's .from() calls.
    jest.resetAllMocks()
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

  it('returns 400 when attempt_id is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const { attempt_id: _, ...noAttempt } = validPayload
    const res = await POST(makeRequest(noAttempt))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid quiz attempt')
  })

  it('returns 400 when attempt_id is not a string', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    const res = await POST(makeRequest({ ...validPayload, attempt_id: 123 }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid quiz attempt')
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
    mockDB()
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    const body = await res.json()
    // q-1..q-9 correctness pattern → score = 8
    expect(body.score).toBe(8)
  })

  it('returns 400 when the attempt does not exist for this user', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({ attempt: null, attemptError: { code: 'PGRST116' } })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid quiz attempt')
  })

  it('returns 400 when the attempt has expired', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({
      attempt: {
        id: 'attempt-1',
        domain: 'devops',
        question_ids: QUESTION_IDS,
        started_at: new Date(Date.now() - 500_000).toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        completed_at: null,
      },
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Quiz attempt has expired')
  })

  it('returns 400 when the payload domain does not match the attempt domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({
      attempt: {
        id: 'attempt-1',
        domain: 'ai',
        question_ids: QUESTION_IDS,
        started_at: new Date(Date.now() - 30_000).toISOString(),
        expires_at: new Date(Date.now() + 300_000).toISOString(),
        completed_at: null,
      },
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Quiz attempt has expired')
  })

  it('returns the previously-recorded score when the attempt was already completed', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({
      attempt: {
        id: 'attempt-1',
        domain: 'devops',
        question_ids: QUESTION_IDS,
        started_at: new Date(Date.now() - 200_000).toISOString(),
        expires_at: new Date(Date.now() + 100_000).toISOString(),
        completed_at: new Date().toISOString(),
      },
      existingResult: { score: 7 },
    })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    expect((await res.json()).score).toBe(7)
  })

  it('returns 500 when question fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({ questions: null, questionsError: { message: 'DB error' } })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })

  it('returns 500 when insert fails and there is no existing row to fall back to', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({ insertError: { message: 'Insert failed' }, existingResult: null })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(500)
  })

  it('returns the existing row score when insert races the unique(quiz_attempt_id) constraint', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    mockDB({ insertError: { message: 'unique_violation' }, existingResult: { score: 9 } })
    const res = await POST(makeRequest(validPayload))
    expect(res.status).toBe(200)
    expect((await res.json()).score).toBe(9)
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
      mockDB()
      const fewAnswers = { 'q-1': 'B', 'q-2': 'A' }
      const res = await POST(makeRequest({ ...validPayload, answers: fewAnswers }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Invalid number of answers')
    })

    it('returns 400 when more than 10 answers are submitted', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
      mockDB()
      const tooMany = { ...validPayload.answers, 'q-11': 'A' }
      const res = await POST(makeRequest({ ...validPayload, answers: tooMany }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Invalid number of answers')
    })

    it('returns 400 when the answer IDs do not match the attempt question IDs', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
      mockDB()
      // Same count (10), but one ID replaced with something the attempt did not issue.
      const swapped = { ...validPayload.answers } as Record<string, string>
      delete swapped['q-10']
      swapped['q-999'] = 'A'
      const res = await POST(makeRequest({ ...validPayload, answers: swapped }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Answers do not match this quiz attempt')
    })

    it('accepts exactly 10 answers', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      mockDB()
      const res = await POST(makeRequest(validPayload))
      expect(res.status).toBe(200)
    })
  })

  describe('time_taken_seconds handling', () => {
    it('accepts a client-provided time within the wall-clock sanity window and records it', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      // Override the standard mock so we can inspect the insert payload.
      mockFrom
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'attempt-1',
                    domain: 'devops',
                    question_ids: QUESTION_IDS,
                    started_at: new Date(Date.now() - 60_000).toISOString(),
                    expires_at: new Date(Date.now() + 240_000).toISOString(),
                    completed_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({ insert: insertMock }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }))

      // wall-clock is ~60s; client claims 55s (as if there was a ~5s pause).
      const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 55 }))
      expect(res.status).toBe(200)
      const inserted = insertMock.mock.calls[0][0]
      expect(inserted.time_taken_seconds).toBeGreaterThanOrEqual(55)
      expect(inserted.time_taken_seconds).toBeLessThanOrEqual(60)
    })

    it('clamps a client claim wildly larger than wall-clock down to wall-clock', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockFrom
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'attempt-1',
                    domain: 'devops',
                    question_ids: QUESTION_IDS,
                    started_at: new Date(Date.now() - 10_000).toISOString(),
                    expires_at: new Date(Date.now() + 290_000).toISOString(),
                    completed_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({ insert: insertMock }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }))

      // wall-clock is ~10s; client claims 9999s → must be clamped down.
      const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 9999 }))
      expect(res.status).toBe(200)
      const inserted = insertMock.mock.calls[0][0]
      expect(inserted.time_taken_seconds).toBeLessThanOrEqual(11)
    })

    it('rejects a client claim so small it implies an impossibly long pause', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com', id: 'uid-1' } })
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockFrom
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'attempt-1',
                    domain: 'devops',
                    question_ids: QUESTION_IDS,
                    started_at: new Date(Date.now() - 250_000).toISOString(),
                    expires_at: new Date(Date.now() + 50_000).toISOString(),
                    completed_at: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: mockDbQuestions, error: null }),
            }),
          }),
        }))
        .mockImplementationOnce(() => ({ insert: insertMock }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }))

      // wall-clock is ~250s; client claims 0. Grace budget is 120s, so the
      // recorded time must be raised to at least 250 - 120 = 130.
      const res = await POST(makeRequest({ ...validPayload, time_taken_seconds: 0 }))
      expect(res.status).toBe(200)
      const inserted = insertMock.mock.calls[0][0]
      expect(inserted.time_taken_seconds).toBeGreaterThanOrEqual(130)
    })
  })
})
