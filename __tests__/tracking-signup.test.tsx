jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }))

import { render, screen, fireEvent } from '@testing-library/react'
import SignupPage from '@/app/signup/page'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('SignupPage tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'x' }) })
  })

  it('fires signup_started (google) when Continue with Google is clicked', () => {
    render(<SignupPage />)
    fireEvent.click(screen.getByText('Continue with Google'))
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'google', location: 'signup_page' })
  })

  it('fires signup_started (credentials) when the form is submitted', () => {
    const { container } = render(<SignupPage />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'credentials', location: 'signup_page' })
  })
})
