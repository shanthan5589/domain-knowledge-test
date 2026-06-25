/**
 * @jest-environment node
 *
 * Tests the landing page server component.
 * Authenticated users are redirected to /dashboard; guests see the page.
 */

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => children }))

import Home from '@/app/page'
import { auth } from '@/auth'

const mockAuth = auth as jest.Mock

describe('Landing page', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects authenticated users to /dashboard', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } })
    try {
      await Home()
      throw new Error('Expected redirect')
    } catch (err) {
      expect((err as Error).message).toBe('NEXT_REDIRECT:/dashboard')
    }
  })

  it('renders the page for unauthenticated users without redirecting', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await Home()
    expect(result).toBeDefined()
  })
})
