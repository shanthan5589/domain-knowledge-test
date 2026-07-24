jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({
  signIn: jest.fn().mockResolvedValue({ error: null }),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }))

import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '@/app/login/page'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('LoginPage tracking', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fires signup_started (google) on Continue with Google', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByText('Continue with Google'))
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'google', location: 'login_page' })
  })

  it('fires signup_started (credentials) on form submit', () => {
    const { container } = render(<LoginPage />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'credentials', location: 'login_page' })
  })
})
