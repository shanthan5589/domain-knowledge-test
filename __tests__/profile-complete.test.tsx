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

jest.mock('country-state-city', () => ({
  Country: {
    getAllCountries: jest.fn(() => [
      { isoCode: 'IN', name: 'India' },
      { isoCode: 'US', name: 'United States' },
    ]),
    getCountryByCode: jest.fn((code: string) =>
      code === 'IN' ? { name: 'India' } : code === 'US' ? { name: 'United States' } : null
    ),
  },
  State: {
    getStatesOfCountry: jest.fn((code: string) =>
      code === 'IN' ? [{ isoCode: 'TG', name: 'Telangana' }, { isoCode: 'KA', name: 'Karnataka' }] : []
    ),
    getStateByCodeAndCountry: jest.fn((stateCode: string, countryCode: string) =>
      stateCode === 'TG' && countryCode === 'IN' ? { name: 'Telangana' } : null
    ),
  },
  City: {
    getCitiesOfState: jest.fn((countryCode: string, stateCode: string) =>
      countryCode === 'IN' && stateCode === 'TG'
        ? [{ name: 'Hyderabad' }, { name: 'Warangal' }]
        : []
    ),
  },
}))

import { useRouter } from 'next/navigation'
const mockUseRouter = useRouter as jest.Mock

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

function fillLocationFields() {
  fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'IN' } })
  fireEvent.change(screen.getByLabelText('State or Region'), { target: { value: 'TG' } })
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Hyderabad' } })
}

function fillRequiredFields() {
  fillLocationFields()
  fireEvent.click(screen.getByLabelText('1-3 years'))
  fireEvent.change(screen.getByLabelText('Designation'), {
    target: { value: 'Software Engineer / Developer' },
  })
}

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText('State or Region')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://linkedin.com/in/yourname')).toBeInTheDocument()
    expect(screen.getByText('Years of Experience')).toBeInTheDocument()
  })

  it('renders designation dropdown with all 12 options plus placeholder', () => {
    render(<CompleteProfilePage />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toContain('')
    expect(options).toContain('Software Engineer / Developer')
    expect(options).toContain('Full-Stack Developer')
    expect(options).toContain('Data Scientist')
    expect(options).toContain('Cloud Architect / Engineer')
    expect(options).toContain('DevOps Engineer')
    expect(options).toContain('Cybersecurity Specialist')
    expect(options).toContain('AI / Machine Learning Engineer')
    expect(options).toContain('UI/UX Designer')
    expect(options).toContain('IT Project Manager')
    expect(options).toContain('Product Owner')
    expect(options).toContain('Business Analyst')
    expect(options).toContain('Other')
    expect(options).toHaveLength(13)
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

  it('progress increases to 60% after filling all location fields', () => {
    render(<CompleteProfilePage />)
    fillLocationFields()
    expect(screen.getByTestId('progress-percent')).toHaveTextContent('60%')
  })

  it('progress reaches 100% when all required fields filled', () => {
    render(<CompleteProfilePage />)
    fillRequiredFields()
    expect(screen.getByTestId('progress-percent')).toHaveTextContent('100%')
  })

  it('checklist shows ✗ for location initially and ✓ after filling all location fields', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('check-location')).toHaveTextContent('✗')
    fillLocationFields()
    expect(screen.getByTestId('check-location')).toHaveTextContent('✓')
  })

  it('checklist shows ✗ for designation initially and ✓ after selecting', () => {
    render(<CompleteProfilePage />)
    expect(screen.getByTestId('check-designation')).toHaveTextContent('✗')
    fireEvent.change(screen.getByLabelText('Designation'), {
      target: { value: 'Data Scientist' },
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

    // Verify the body contains human-readable location names (not ISO codes)
    const [, fetchOptions] = mockFetch.mock.calls[0]
    const body = JSON.parse(fetchOptions.body)
    expect(body.country).toBe('India')
    expect(body.state_region).toBe('Telangana')
    expect(body.city).toBe('Hyderabad')
    expect(body.years_of_experience).toBe('1-3 years')
    expect(body.designation).toBe('Software Engineer / Developer')
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
