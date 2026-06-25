/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/profile/route'

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: jest.fn() },
}))

import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const mockAuth = auth as jest.Mock
const mockFrom = supabaseAdmin.from as jest.Mock

const authedSession = { user: { email: 'test@test.com', id: 'uid-1' } }

const validPatch = {
  location: 'Hyderabad, India',
  years_of_experience: '1-3 years',
  designation: 'Software Engineer',
  linkedin_url: 'https://linkedin.com/in/test',
}

function makePatchRequest(body: object) {
  return new NextRequest('http://localhost/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/profile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns profile data for authenticated user', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { full_name: 'Test User', email: 'test@test.com', location: 'Hyderabad', profile_completed: true },
            error: null,
          }),
        }),
      }),
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.email).toBe('test@test.com')
    expect(body.profile.location).toBe('Hyderabad')
  })

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

// ── PATCH ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/profile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(401)
  })

  it('returns 400 when location is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, location: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Location is required')
  })

  it('returns 400 when years_of_experience is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, years_of_experience: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Years of experience is required')
  })

  it('returns 400 when designation is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, designation: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Designation is required')
  })

  it('returns 400 for invalid years_of_experience value', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, years_of_experience: '2 years' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid years of experience value')
  })

  it('returns 400 for invalid JSON', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and sets profile_completed on success', async () => {
    mockAuth.mockResolvedValue(authedSession)
    let updatedData: Record<string, unknown> = {}
    mockFrom.mockReturnValue({
      update: jest.fn().mockImplementation((data) => {
        updatedData = data
        return { eq: jest.fn().mockResolvedValue({ error: null }) }
      }),
    })
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(updatedData.profile_completed).toBe(true)
  })

  it('returns 200 when linkedin_url is omitted (optional)', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
    const { linkedin_url: _, ...noLinkedin } = validPatch
    const res = await PATCH(makePatchRequest(noLinkedin))
    expect(res.status).toBe(200)
  })

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      }),
    })
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(500)
  })

  it('accepts all valid years_of_experience values', async () => {
    const validValues = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']
    for (const value of validValues) {
      mockAuth.mockResolvedValue(authedSession)
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      })
      const res = await PATCH(makePatchRequest({ ...validPatch, years_of_experience: value }))
      expect(res.status).toBe(200)
    }
  })
})
