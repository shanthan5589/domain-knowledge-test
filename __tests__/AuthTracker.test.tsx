jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))

import { render } from '@testing-library/react'
import AuthTracker from '@/components/analytics/AuthTracker'
import { trackEvent } from '@/lib/analytics'
import { useSession } from 'next-auth/react'

const mockTrackEvent = trackEvent as jest.Mock
const mockUseSession = useSession as jest.Mock

describe('AuthTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.sessionStorage.clear()
  })

  it('fires signup_completed once when authenticated', () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    render(<AuthTracker />)
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_completed')
  })

  it('does not fire when unauthenticated', () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated' })
    render(<AuthTracker />)
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  it('does not fire when loading', () => {
    mockUseSession.mockReturnValue({ status: 'loading' })
    render(<AuthTracker />)
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })

  it('does not fire again in the same browser session', () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    const first = render(<AuthTracker />)
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    first.unmount()
    render(<AuthTracker />)
    // The sessionStorage guard key persists, so a second mount does not refire.
    expect(mockTrackEvent).toHaveBeenCalledTimes(1)
  })
})
