// Verifies the trackEvent wrapper forwards to Vercel's track() in the browser
// and is a safe no-op on the server.
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }))

import { trackEvent } from '@/lib/analytics'
import { track } from '@vercel/analytics'

const mockTrack = track as jest.Mock

describe('trackEvent', () => {
  beforeEach(() => jest.clearAllMocks())
  afterEach(() => {
    delete (window as unknown as { va?: unknown }).va
    delete (window as unknown as { vaq?: unknown }).vaq
  })

  it('forwards a no-prop event to Vercel track()', () => {
    trackEvent('landing_viewed')
    expect(mockTrack).toHaveBeenCalledWith('landing_viewed', undefined)
  })

  it('forwards event name and props to Vercel track()', () => {
    trackEvent('quiz_completed', { domain: 'ai', score: 8 })
    expect(mockTrack).toHaveBeenCalledWith('quiz_completed', { domain: 'ai', score: 8 })
  })

  // Regression test: @vercel/analytics/next wraps its real component in a
  // Suspense boundary (it reads useSearchParams), so its effect that creates
  // window.va commits in a later React pass than an ordinary mount effect
  // (e.g. PageViewTracker firing landing_viewed). Before this fix, calling
  // track() while window.va didn't exist yet silently dropped the event —
  // confirmed live in the browser before the fix, and fixed by having
  // trackEvent create the same queue stub Vercel's own inject() creates.
  it('creates a window.va queue stub itself, so an event fired before Vercel\'s <Analytics /> mounts is not silently dropped', () => {
    delete (window as unknown as { va?: unknown }).va
    trackEvent('landing_viewed')
    expect(typeof (window as unknown as { va?: unknown }).va).toBe('function')
  })

  it('does not overwrite an existing window.va, so it stays compatible with the queue Vercel\'s own <Analytics /> creates', () => {
    const existingVa = jest.fn()
    ;(window as unknown as { va?: unknown }).va = existingVa
    trackEvent('domain_selected', { domain: 'ai' })
    expect((window as unknown as { va?: unknown }).va).toBe(existingVa)
  })

  // Server no-op test lives in analytics-server.test.ts (@jest-environment node),
  // because jsdom's window is non-configurable and cannot be shadowed here.
})
