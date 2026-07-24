jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))

import { render } from '@testing-library/react'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('PageViewTracker', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fires the given event once on mount', () => {
    render(<PageViewTracker event="landing_viewed" />)
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith('landing_viewed')
  })
})
