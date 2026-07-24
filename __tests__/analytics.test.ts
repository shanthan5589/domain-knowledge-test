// Verifies the trackEvent wrapper forwards to Vercel's track() in the browser
// and is a safe no-op on the server.
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }))

import { trackEvent } from '@/lib/analytics'
import { track } from '@vercel/analytics'

const mockTrack = track as jest.Mock

describe('trackEvent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('forwards a no-prop event to Vercel track()', () => {
    trackEvent('landing_viewed')
    expect(mockTrack).toHaveBeenCalledWith('landing_viewed', undefined)
  })

  it('forwards event name and props to Vercel track()', () => {
    trackEvent('quiz_completed', { domain: 'ai', score: 8 })
    expect(mockTrack).toHaveBeenCalledWith('quiz_completed', { domain: 'ai', score: 8 })
  })

  // Server no-op test lives in analytics-server.test.ts (@jest-environment node),
  // because jsdom's window is non-configurable and cannot be shadowed here.
})
