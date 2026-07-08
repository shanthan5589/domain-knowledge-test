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

  // Checking the matcher string for substrings (above) isn't enough to catch a
  // regex mistake — this actually runs the pattern against real paths, the way
  // Next.js would, to confirm which routes the middleware fires on.
  it('actually matches/excludes the right paths when evaluated as a regex', async () => {
    const { config } = await import('@/proxy')
    const matcher = new RegExp(`^${config.matcher[0]}$`)

    // The public landing page must NOT be matched (must stay unprotected),
    // otherwise logged-out visitors get redirected to /login before
    // app/page.tsx ever renders the landing page.
    expect(matcher.test('/')).toBe(false)

    expect(matcher.test('/login')).toBe(false)
    expect(matcher.test('/signup')).toBe(false)
    expect(matcher.test('/api/stats')).toBe(false)
    expect(matcher.test('/favicon.ico')).toBe(false)

    // Real protected routes must still be matched.
    expect(matcher.test('/dashboard')).toBe(true)
    expect(matcher.test('/profile')).toBe(true)
    expect(matcher.test('/test/ai')).toBe(true)
    expect(matcher.test('/stats')).toBe(true)
  })
})
