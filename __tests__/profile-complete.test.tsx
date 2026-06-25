import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CompleteProfilePage from '@/app/profile/complete/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@test.com' } },
    update: jest.fn().mockResolvedValue({}),
  })),
}))

import { useRouter } from 'next/navigation'
const mockUseRouter = useRouter as jest.Mock

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText('Hyderabad, India'), {
    target: { value: 'Hyderabad, India' },
  })
  fireEvent.click(screen.getByLabelText('1-3 years'))
  fireEvent.change(screen.getByPlaceholderText('e.g. Software Engineer'), {
    target: { value: 'Software Engineer' },
  })
}

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByPlaceholderText('Hyderabad, India')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Software Engineer')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://linkedin.com/in/yourname')).toBeInTheDocument()
    expect(screen.getByText('Years of Experience')).toBeInTheDocument()
  })

  it('renders all 5 experience radio options', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByLabelText('Fresher')).toBeInTheDocument()
    expect(screen.getByLabelText('1-3 years')).toBeInTheDocument()
    expect(screen.getByLabelText('3-5 years')).toBeInTheDocument()
    expect(screen.getByLabelText('5-10 years')).toBeInTheDocument()
    expect(screen.getByLabelText('10+ years')).toBeInTheDocument()
  })

  it('shows Continue button as disabled initially', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('enables Continue button only when all 3 required fields are filled', () => {
    render(<CompleteProfilePage />)
    const btn = screen.getByRole('button', { name: /continue/i })
    expect(btn).toBeDisabled()
    fillRequiredFields()
    expect(btn).not.toBeDisabled()
  })

  it('progress starts at 40% (name + email pre-counted)', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('progress-percent')).toHaveTextContent('40%')
  })

  it('progress increases to 60% after filling location', () => {
    render(<CompleteProfilePage />)
    fireEvent.change(screen.getByPlaceholderText('Hyderabad, India'), {
      target: { value: 'Hyderabad' },
    })
    expect(screen.getByTestId('progress-percent')).toHaveTextContent('60%')
  })

  it('progress reaches 100% when all required fields filled', () => {
    render(<CompleteProfilePage />)
    fillRequiredFields()
    expect(screen.getByTestId('progress-percent')).toHaveTextContent('100%')
  })

  it('checklist shows ✗ for location initially and ✓ after typing', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('check-location')).toHaveTextContent('✗')
    fireEvent.change(screen.getByPlaceholderText('Hyderabad, India'), {
      target: { value: 'Hyderabad' },
    })
    expect(screen.getByTestId('check-location')).toHaveTextContent('✓')
  })

  it('checklist shows ✗ for designation initially and ✓ after typing', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('check-designation')).toHaveTextContent('✗')
    fireEvent.change(screen.getByPlaceholderText('e.g. Software Engineer'), {
      target: { value: 'Engineer' },
    })
    expect(screen.getByTestId('check-designation')).toHaveTextContent('✓')
  })

  it('checklist shows ○ for LinkedIn (optional) initially', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('check-linkedin')).toHaveTextContent('○')
  })

  it('checklist shows ✓ for LinkedIn after filling it', () => {
    render(<CompleteProfilePage />)
    fireEvent.change(screen.getByPlaceholderText('https://linkedin.com/in/yourname'), {
      target: { value: 'https://linkedin.com/in/test' },
    })
    expect(screen.getByTestId('check-linkedin')).toHaveTextContent('✓')
  })

  it('calls PATCH /api/profile on submit and redirects to dashboard', async () => {
    const push = jest.fn()
    mockUseRouter.mockReturnValue({ push })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })

    render(<CompleteProfilePage />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PATCH' }))
      expect(push).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update profile' }),
    })

    render(<CompleteProfilePage />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })
  })

  it('submit button shows loading state while submitting', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})) // never resolves

    render(<CompleteProfilePage />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })
})
