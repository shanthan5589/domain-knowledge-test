/**
 * @jest-environment node
 *
 * Tests the server-side guard: trackEvent must be a no-op when window is
 * undefined (i.e. when called from a Next.js server component or RSC).
 * Runs in a real Node environment so window is genuinely absent.
 */
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }))

import { trackEvent } from '@/lib/analytics'
import { track } from '@vercel/analytics'

const mockTrack = track as jest.Mock

describe('trackEvent (server / no window)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('is a no-op and does not throw when window is undefined', () => {
    expect(() => trackEvent('landing_viewed')).not.toThrow()
    expect(mockTrack).not.toHaveBeenCalled()
  })
})
