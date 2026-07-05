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
  country: 'India',
  state_region: 'Telangana',
  city: 'Hyderabad',
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
            data: { full_name: 'Test User', email: 'test@test.com', country: 'India', state_region: 'Telangana', city: 'Hyderabad', profile_completed: true },
            error: null,
          }),
        }),
      }),
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.email).toBe('test@test.com')
    expect(body.profile.country).toBe('India')
    expect(body.profile.state_region).toBe('Telangana')
    expect(body.profile.city).toBe('Hyderabad')
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

  it('returns 400 when country is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, country: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Country is required')
  })

  it('returns 400 when state_region is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, state_region: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('State/Region is required')
  })

  it('returns 400 when city is missing', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, city: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('City is required')
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
      upsert: jest.fn().mockImplementation((data) => {
        updatedData = data
        return Promise.resolve({ error: null })
      }),
    })
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(updatedData.email).toBe('test@test.com')
    expect(updatedData.full_name).toBeUndefined()
    expect(updatedData.profile_completed).toBe(true)
    expect(updatedData.country).toBe('India')
    expect(updatedData.state_region).toBe('Telangana')
    expect(updatedData.city).toBe('Hyderabad')
  })

  it('returns 200 when linkedin_url is omitted (optional)', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    })
    const noLinkedin = {
      country: validPatch.country,
      state_region: validPatch.state_region,
      city: validPatch.city,
      years_of_experience: validPatch.years_of_experience,
      designation: validPatch.designation,
    }
    const res = await PATCH(makePatchRequest(noLinkedin))
    expect(res.status).toBe(200)
  })

  it('returns 500 on database error', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    })
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(500)
  })

  it('logs code/details/hint from the Supabase error without changing the response body', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: {
            message: 'duplicate key value violates unique constraint',
            code: '23505',
            details: 'Key (email)=(test@test.com) already exists.',
            hint: 'Missing UNIQUE constraint on profiles.email',
          },
        }),
      }),
    })
    const res = await PATCH(makePatchRequest(validPatch))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Failed to update profile')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[PATCH /api/profile] Supabase error:',
      expect.objectContaining({ code: '23505', details: expect.any(String), hint: expect.any(String) })
    )
    consoleErrorSpy.mockRestore()
  })

  it('returns 400 when country exceeds max length', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, country: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Country/)
  })

  it('returns 400 when state_region exceeds max length', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, state_region: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/State\/Region/)
  })

  it('returns 400 when city exceeds max length', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, city: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/City/)
  })

  it('returns 400 when designation exceeds max length', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, designation: 'a'.repeat(201) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Designation/)
  })

  it('accepts a field exactly at the max length boundary', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
    const res = await PATCH(makePatchRequest({ ...validPatch, city: 'a'.repeat(200) }))
    expect(res.status).toBe(200)
  })

  it('returns 400 when linkedin_url is not a valid URL', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: 'not a url' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/LinkedIn URL/)
  })

  it('returns 400 when linkedin_url uses javascript: protocol', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: 'javascript:alert(1)' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/LinkedIn URL/)
  })

  it('returns 400 when linkedin_url uses data: protocol', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: 'data:text/html,<script>alert(1)</script>' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/LinkedIn URL/)
  })

  it('returns 400 when linkedin_url uses http (non-https) protocol', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: 'http://linkedin.com/in/test' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/LinkedIn URL/)
  })

  it('returns 400 when linkedin_url exceeds max length', async () => {
    mockAuth.mockResolvedValue(authedSession)
    const longUrl = 'https://linkedin.com/in/' + 'a'.repeat(200)
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: longUrl }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/LinkedIn URL/)
  })

  it('accepts a valid https linkedin_url', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockFrom.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })
    const res = await PATCH(makePatchRequest({ ...validPatch, linkedin_url: 'https://linkedin.com/in/test' }))
    expect(res.status).toBe(200)
  })

  it('accepts all valid years_of_experience values', async () => {
    const validValues = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']
    for (const value of validValues) {
      mockAuth.mockResolvedValue(authedSession)
      mockFrom.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      })
      const res = await PATCH(makePatchRequest({ ...validPatch, years_of_experience: value }))
      expect(res.status).toBe(200)
    }
  })
})
