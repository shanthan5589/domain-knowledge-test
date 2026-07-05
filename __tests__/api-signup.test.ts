/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/auth/signup/route'

jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: { from: jest.fn() },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}))

import { supabaseAdmin } from '@/lib/supabase-server'
const mockFrom = supabaseAdmin.from as jest.Mock

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'securepass123',
}

function mockNoExisting() {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  })
}

function mockInsertSuccess() {
  mockFrom.mockReturnValueOnce({
    insert: jest.fn().mockResolvedValue({ error: null }),
  })
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 201 on successful signup', async () => {
    mockNoExisting()
    mockInsertSuccess()
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 400 when firstName is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, firstName: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('First name is required')
  })

  it('returns 400 when lastName is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, lastName: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Last name is required')
  })

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, email: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Email is required')
  })

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, password: '' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Password is required')
  })

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid email address')
  })

  it('returns 400 when password is less than 8 characters', async () => {
    const res = await POST(makeRequest({ ...validBody, password: 'short' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Password must be at least 8 characters')
  })

  it('returns 409 when email already exists, without confirming the email is registered', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
        }),
      }),
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(409)
    const { error } = await res.json()
    // Message must not state the email already exists — that would let an
    // attacker enumerate registered accounts via this endpoint.
    expect(error).not.toMatch(/already exists/i)
    expect(error.length).toBeGreaterThan(0)
  })

  it('returns 400 when firstName exceeds max length', async () => {
    const res = await POST(makeRequest({ ...validBody, firstName: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('First name is too long')
  })

  it('returns 400 when lastName exceeds max length', async () => {
    const res = await POST(makeRequest({ ...validBody, lastName: 'a'.repeat(101) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Last name is too long')
  })

  it('returns 400 when email exceeds max length', async () => {
    const longEmail = `${'a'.repeat(250)}@example.com`
    const res = await POST(makeRequest({ ...validBody, email: longEmail }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Email is too long')
  })

  it('returns 400 for email with consecutive dots', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'john..doe@example.com' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid email address')
  })

  it('returns 400 for email with no TLD', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'john@localhost' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Invalid email address')
  })

  it('returns 500 when insert fails', async () => {
    mockNoExisting()
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    })
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(500)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('stores email in lowercase', async () => {
    mockNoExisting()
    let insertedData: Record<string, unknown> = {}
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      }),
    })
    await POST(makeRequest({ ...validBody, email: 'JOHN@EXAMPLE.COM' }))
    expect(insertedData.email).toBe('john@example.com')
  })

  it('stores full_name as first + last name combined', async () => {
    mockNoExisting()
    let insertedData: Record<string, unknown> = {}
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockImplementation((data) => {
        insertedData = data
        return Promise.resolve({ error: null })
      }),
    })
    await POST(makeRequest(validBody))
    expect(insertedData.full_name).toBe('John Doe')
  })

  it('returns 400 when firstName is only whitespace', async () => {
    const res = await POST(makeRequest({ ...validBody, firstName: '   ' }))
    expect(res.status).toBe(400)
  })

})
