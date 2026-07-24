jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }))

import { render, screen, fireEvent } from '@testing-library/react'
import HomeSignupForm from '@/components/HomeSignupForm'
import { trackEvent } from '@/lib/analytics'

const mockTrackEvent = trackEvent as jest.Mock

describe('HomeSignupForm tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'x' }) })
  })

  it('fires signup_started (google) when Continue with Google is clicked', () => {
    render(<HomeSignupForm />)
    fireEvent.click(screen.getByText('Continue with Google'))
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'google', location: 'landing' })
  })

  it('fires signup_started (credentials) when the form is submitted', () => {
    const { container } = render(<HomeSignupForm />)
    fireEvent.submit(container.querySelector('form')!)
    expect(mockTrackEvent).toHaveBeenCalledWith('signup_started', { method: 'credentials', location: 'landing' })
  })
})
