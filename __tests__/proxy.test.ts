/**
 * @jest-environment node
 *
 * Tests the middleware exported from proxy.ts. NextAuth's `auth()` wrapper
 * (from @/auth) is mocked so we can invoke the inner callback directly with a
 * fake request object and assert on redirect behavior.
 */
import { NextResponse } from 'next/server'

type FakeAuthedRequest = {
  auth: { user: { id: string } } | null
  nextUrl: URL
}

type MiddlewareCallback = (req: FakeAuthedRequest) => unknown

let capturedCallback: MiddlewareCallback

jest.mock('@/auth', () => ({
  auth: jest.fn((callback: MiddlewareCallback) => {
    capturedCallback = callback
    return callback
  }),
}))

function makeReq(authed: boolean, path = '/dashboard'): FakeAuthedRequest {
  return {
    auth: authed ? { user: { id: '1' } } : null,
    nextUrl: new URL(`http://localhost:3000${path}`),
  }
}

describe('proxy middleware', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('redirects unauthenticated requests to /login', async () => {
    await import('@/proxy')
    const result = capturedCallback(makeReq(false, '/dashboard')) as NextResponse

    expect(result).toBeDefined()
    expect(result.status).toBe(307)
    expect(result.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('allows authenticated requests through (no redirect)', async () => {
    await import('@/proxy')
    const result = capturedCallback(makeReq(true, '/dashboard'))

    expect(result).toBeUndefined()
  })

  it('exports a matcher that includes protected routes but excludes login/signup/api', async () => {
    const { config } = await import('@/proxy')
    expect(config.matcher).toBeDefined()
    const pattern = config.matcher[0]
    expect(pattern).toContain('login')
    expect(pattern).toContain('signup')
    expect(pattern).toContain('api')
  })
})
