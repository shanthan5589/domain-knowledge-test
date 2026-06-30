import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileEditForm from '@/app/profile/ProfileEditForm'

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
      code === 'IN' ? [{ isoCode: 'TG', name: 'Telangana' }] : []
    ),
    getStateByCodeAndCountry: jest.fn((stateCode: string, countryCode: string) =>
      stateCode === 'TG' && countryCode === 'IN' ? { name: 'Telangana' } : null
    ),
  },
  City: {
    getCitiesOfState: jest.fn((countryCode: string, stateCode: string) =>
      countryCode === 'IN' && stateCode === 'TG'
        ? [{ name: 'Hyderabad' }]
        : []
    ),
  },
}))

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

const defaultProps = {
  initialValues: {
    full_name: 'Jane Doe',
    email: 'jane@example.com',
    country: 'India',
    state_region: 'Telangana',
    city: 'Hyderabad',
    years_of_experience: '5-10 years',
    designation: 'Data Scientist',
    linkedin_url: '',
  },
}

describe('ProfileEditForm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders read-only name and email', () => {
    render(<ProfileEditForm {...defaultProps} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('renders designation as a dropdown', () => {
    render(<ProfileEditForm {...defaultProps} />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
  })

  it('pre-selects designation from initialValues when it matches an option', () => {
    render(<ProfileEditForm {...defaultProps} />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    expect(select.value).toBe('Data Scientist')
  })

  it('shows empty selection when initialValues designation does not match any option', () => {
    render(<ProfileEditForm {...defaultProps} initialValues={{ ...defaultProps.initialValues, designation: 'Custom Old Value' }} />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('renders all 12 designation options plus placeholder', () => {
    render(<ProfileEditForm {...defaultProps} />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
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

  it('updates designation when user selects a new option', () => {
    render(<ProfileEditForm {...defaultProps} />)
    const select = screen.getByLabelText('Designation') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'DevOps Engineer' } })
    expect(select.value).toBe('DevOps Engineer')
  })

  it('calls PATCH /api/profile with selected designation on submit', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
    render(<ProfileEditForm {...defaultProps} />)
    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'DevOps Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body.designation).toBe('DevOps Engineer')
    })
  })

  it('shows "Profile saved successfully!" after successful save', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
    render(<ProfileEditForm {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Profile saved successfully!')).toBeInTheDocument()
    })
  })

  it('shows error message when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update profile' }),
    })
    render(<ProfileEditForm {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to update profile')).toBeInTheDocument()
    })
  })
})
