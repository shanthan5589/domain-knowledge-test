import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignupPage from '@/app/signup/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
const mockSignIn = signIn as jest.Mock
const mockUseRouter = useRouter as jest.Mock

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

describe('SignupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<SignupPage />)
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
  })

  it('renders the Create Account heading', () => {
    render(<SignupPage />)
    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('renders a link back to login', () => {
    render(<SignupPage />)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('renders the Create Account submit button', () => {
    render(<SignupPage />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders the Continue with Google button', () => {
    render(<SignupPage />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('calls signIn with google when Google button is clicked', async () => {
    mockSignIn.mockResolvedValueOnce({})
    render(<SignupPage />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
  })

  it('shows error message returned from API', async () => {
    const apiError = 'Unable to create account with these details. If you already have an account, try logging in or resetting your password.'
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: apiError }),
    })
    render(<SignupPage />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText(apiError)).toBeInTheDocument()
    })
  })

  it('calls signIn after successful signup and redirects to dashboard', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<SignupPage />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'john@example.com',
        password: 'password123',
        redirect: false,
      })
      expect(push).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects to login if auto-login fails after signup', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })
    mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' })

    render(<SignupPage />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login')
    })
  })

  it('shows loading state while submitting', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // never resolves
    render(<SignupPage />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'John' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
    })
  })
})
