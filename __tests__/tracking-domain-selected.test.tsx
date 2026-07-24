jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { render, screen, fireEvent } from '@testing-library/react'
import DomainSelector from '@/components/DomainSelector'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('DomainSelector tracking', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fires domain_selected with the chosen domain when Start Test is confirmed', () => {
    render(<DomainSelector />)
    fireEvent.click(screen.getByText('DevOps & CI/CD'))
    fireEvent.click(screen.getByText('Start Test'))
    expect(mockTrackEvent).toHaveBeenCalledWith('domain_selected', { domain: 'devops' })
  })

  it('does not fire domain_selected until Start Test is confirmed', () => {
    render(<DomainSelector />)
    fireEvent.click(screen.getByText('DevOps & CI/CD'))
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
