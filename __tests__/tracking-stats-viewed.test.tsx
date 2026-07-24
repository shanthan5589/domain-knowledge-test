jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: { user: { name: 'Test User', email: 'test@test.com' } } })),
  signOut: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))
// Stub the heavy tab/child components so this suite only exercises the mount
// tracking, not their internals.
jest.mock('@/components/AppHeader', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/UserMenu', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/DomainOverview', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/Leaderboard', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/stats/CommunityInsights', () => ({ __esModule: true, default: () => null }))

import { render, waitFor } from '@testing-library/react'
import StatsPage from '@/app/stats/page'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('Stats page tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Fail both fetches fast so StatsContent settles without needing real data.
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
  })
  afterEach(() => jest.restoreAllMocks())

  it('fires stats_viewed with the initial domain on mount', async () => {
    render(<StatsPage />)
    await waitFor(() =>
      expect(mockTrackEvent).toHaveBeenCalledWith('stats_viewed', { domain: 'ai' })
    )
  })
})
