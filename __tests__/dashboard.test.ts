/**
 * @jest-environment node
 *
 * Tests the profile-completion gate in the dashboard server component.
 * redirect() is made to throw so we can assert which path it was called with.
 */

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/supabase-server', () => ({ supabaseAdmin: { from: jest.fn() } }))
jest.mock('@/components/DomainSelector', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/UserMenu', () => ({ __esModule: true, default: () => null }))

import DashboardPage from '@/app/dashboard/page'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const mockAuth = auth as jest.Mock
const mockFrom = supabaseAdmin.from as jest.Mock

const authedSession = { user: { email: 'test@test.com', name: 'Test User', id: 'uid-1' } }

function mockProfileSelect(profileData: Record<string, unknown> | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: profileData, error: null }),
          }),
        }),
      }
    }
    // test_results — return empty list so dashboard renders without crashing
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    }
  })
}

async function expectRedirectTo(path: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    throw new Error('Expected redirect but none was thrown')
  } catch (err) {
    expect((err as Error).message).toBe(`NEXT_REDIRECT:${path}`)
  }
}

describe('DashboardPage — profile completion gate', () => {
  beforeEach(() => jest.clearAllMocks())

  it('redirects to /login when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    await expectRedirectTo('/login', () => DashboardPage())
  })

  it('redirects to /profile/complete when profile_completed is false', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: false, country: null, state_region: null, city: null })
    await expectRedirectTo('/profile/complete', () => DashboardPage())
  })

  it('redirects to /profile/complete when profile_completed is null', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: null, country: null, state_region: null, city: null })
    await expectRedirectTo('/profile/complete', () => DashboardPage())
  })

  it('redirects existing users who have profile_completed=true but missing country', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: true, country: null, state_region: 'Telangana', city: 'Hyderabad' })
    await expectRedirectTo('/profile/complete', () => DashboardPage())
  })

  it('redirects existing users who have profile_completed=true but missing state_region', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: true, country: 'India', state_region: null, city: 'Hyderabad' })
    await expectRedirectTo('/profile/complete', () => DashboardPage())
  })

  it('redirects existing users who have profile_completed=true but missing city', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: true, country: 'India', state_region: 'Telangana', city: null })
    await expectRedirectTo('/profile/complete', () => DashboardPage())
  })

  it('allows access when profile_completed=true and all location fields are present', async () => {
    mockAuth.mockResolvedValue(authedSession)
    mockProfileSelect({ profile_completed: true, country: 'India', state_region: 'Telangana', city: 'Hyderabad' })
    // Should not throw a redirect — just render normally
    await expect(DashboardPage()).resolves.not.toThrow()
  })
})
