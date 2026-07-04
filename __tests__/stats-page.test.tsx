import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StatsPage from '@/app/stats/page'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { name: 'Test User', email: 'test@test.com' } },
  })),
  signOut: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

function mockStatsResponse(overrides: Partial<{ histogram: number[]; totalUsers: number; yourScore: number | null }> = {}) {
  return {
    ok: true,
    json: async () => ({
      histogram: [0, 0, 0, 0, 0, 1, 0, 1, 2, 0, 1],
      totalUsers: 5,
      yourScore: 10,
      ...overrides,
    }),
  }
}

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches stats for the default domain on mount', async () => {
    mockFetch.mockResolvedValueOnce(mockStatsResponse())
    render(<StatsPage />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai'))
    })
  })

  it('renders domain and designation dropdowns', async () => {
    mockFetch.mockResolvedValue(mockStatsResponse())
    render(<StatsPage />)
    expect(screen.getByLabelText('Domain')).toBeInTheDocument()
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  })

  it('shows the chart once data is loaded', async () => {
    mockFetch.mockResolvedValueOnce(mockStatsResponse())
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-chart')).toBeInTheDocument()
    })
  })

  it("highlights the bar matching the user's score", async () => {
    mockFetch.mockResolvedValueOnce(mockStatsResponse({ yourScore: 8 }))
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('you-marker')).toBeInTheDocument()
    })
  })

  it('shows a not-enough-data message when the sample size is small', async () => {
    mockFetch.mockResolvedValueOnce(
      mockStatsResponse({ totalUsers: 2, histogram: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1] })
    )
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-empty')).toBeInTheDocument()
    })
  })

  it('refetches when the domain dropdown changes', async () => {
    mockFetch.mockResolvedValue(mockStatsResponse())
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'cybersecurity' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=cybersecurity'))
    })
  })

  it('refetches when the designation dropdown changes', async () => {
    mockFetch.mockResolvedValue(mockStatsResponse())
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Data Scientist' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('designation=Data+Scientist'))
    })
  })

  it('shows an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'fail' }) })
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByText('Could not load stats. Please try again.')).toBeInTheDocument()
    })
  })
})
