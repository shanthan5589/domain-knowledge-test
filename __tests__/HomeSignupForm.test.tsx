import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomeSignupForm from '@/components/HomeSignupForm'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
const mockSignIn = signIn as jest.Mock
const mockUseRouter = useRouter as jest.Mock

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

describe('HomeSignupForm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders card title and subtitle', () => {
    render(<HomeSignupForm />)
    expect(screen.getByRole('heading', { name: 'Create your benchmark profile' })).toBeInTheDocument()
    expect(screen.getByText('Track your proficiency gains over time.')).toBeInTheDocument()
  })

  it('renders OR EMAIL SIGNUP divider', () => {
    render(<HomeSignupForm />)
    expect(screen.getByText('OR EMAIL SIGNUP')).toBeInTheDocument()
  })

  it('renders all four form fields', () => {
    render(<HomeSignupForm />)
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min. 8 characters')).toBeInTheDocument()
  })

  it('renders Continue with Google button', () => {
    render(<HomeSignupForm />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders Create Account submit button', () => {
    render(<HomeSignupForm />)
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders Sign in link pointing to /login', () => {
    render(<HomeSignupForm />)
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })

  it('calls signIn with google when Google button is clicked', () => {
    mockSignIn.mockResolvedValueOnce({})
    render(<HomeSignupForm />)
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
  })

  it('shows API error message on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'An account with this email already exists' }),
    })
    render(<HomeSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists')).toBeInTheDocument()
    })
  })

  it('submits firstName, lastName, email, password and redirects to dashboard', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })
    mockSignIn.mockResolvedValueOnce({ error: null })

    render(<HomeSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', password: 'password123' }),
      }))
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'jane@example.com',
        password: 'password123',
        redirect: false,
      })
      expect(push).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('redirects to /login if auto-login fails after signup', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })
    mockSignIn.mockResolvedValueOnce({ error: 'CredentialsSignin' })

    render(<HomeSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login')
    })
  })

  it('shows loading state while submitting', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}))
    render(<HomeSignupForm />)
    fireEvent.change(screen.getByPlaceholderText('John'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Smith' } })
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
    })
  })
})
