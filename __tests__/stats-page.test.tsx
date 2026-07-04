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

function statsBody(overrides: Partial<{
  histogram: number[]
  totalUsers: number
  yourScore: number | null
  percentile: number | null
}> = {}) {
  return {
    histogram: [0, 0, 0, 0, 0, 1, 0, 1, 2, 0, 1],
    totalUsers: 5,
    yourScore: 10,
    percentile: 80,
    ...overrides,
  }
}

const overviewBody = {
  averageScoreByDomain: { ai: 7, cloud: null, cybersecurity: null, devops: null, data_science: null },
  attemptCounts: { ai: 5, cloud: 0, cybersecurity: 0, devops: 0, data_science: 0 },
  mostAttemptedDomain: 'ai',
}

const leaderboardBody = { leaderboard: [] }

// StatsPage itself fetches /api/stats, while its DomainOverview and Leaderboard
// children each fetch their own endpoint — route mocked responses by URL so all
// three get a shape they can actually render.
function installFetchMock(stats: object = statsBody()) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/stats/overview')) {
      return Promise.resolve({ ok: true, json: async () => overviewBody })
    }
    if (url.includes('/api/stats/leaderboard')) {
      return Promise.resolve({ ok: true, json: async () => leaderboardBody })
    }
    return Promise.resolve({ ok: true, json: async () => stats })
  })
}

describe('StatsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches stats for the default domain on mount', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai'))
    })
  })

  it('renders all filter dropdowns', async () => {
    installFetchMock()
    render(<StatsPage />)
    expect(screen.getByLabelText('Domain')).toBeInTheDocument()
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    expect(screen.getByLabelText('Experience')).toBeInTheDocument()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText('State or Region')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  })

  it('state and city dropdowns start disabled until a country/state is chosen', async () => {
    installFetchMock()
    render(<StatsPage />)
    expect(screen.getByLabelText('State or Region')).toBeDisabled()
    expect(screen.getByLabelText('City')).toBeDisabled()
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  })

  it('shows the chart once data is loaded', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-chart')).toBeInTheDocument()
    })
  })

  it("highlights the bar matching the user's score", async () => {
    installFetchMock(statsBody({ yourScore: 8 }))
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('you-marker')).toBeInTheDocument()
    })
  })

  it('shows the percentile callout when available', async () => {
    installFetchMock(statsBody({ percentile: 72 }))
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('percentile-callout')).toHaveTextContent('72%')
    })
  })

  it('omits the percentile callout when the user has no score yet', async () => {
    installFetchMock(statsBody({ yourScore: null, percentile: null }))
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
    expect(screen.queryByTestId('percentile-callout')).not.toBeInTheDocument()
  })

  it('shows a not-enough-data message when the sample size is small', async () => {
    installFetchMock(statsBody({ totalUsers: 2, histogram: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1] }))
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-empty')).toBeInTheDocument()
    })
  })

  it('refetches when the domain dropdown changes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    fireEvent.change(screen.getByLabelText('Domain'), { target: { value: 'cybersecurity' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=cybersecurity'))
    })
  })

  it('refetches when the designation dropdown changes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Data Scientist' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('designation=Data+Scientist'))
    })
  })

  it('refetches when the experience dropdown changes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    fireEvent.change(screen.getByLabelText('Experience'), { target: { value: '5-10 years' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('experience=5-10+years'))
    })
  })

  it('cascades country -> state -> city and sends human-readable names', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))

    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'IN' } })
    expect(screen.getByLabelText('State or Region')).not.toBeDisabled()

    fireEvent.change(screen.getByLabelText('State or Region'), { target: { value: 'TG' } })
    expect(screen.getByLabelText('City')).not.toBeDisabled()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('country=India'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state_region=Telangana'))
    })
  })

  it('shows an error message when the stats fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/stats/overview')) {
        return Promise.resolve({ ok: true, json: async () => overviewBody })
      }
      if (url.includes('/api/stats/leaderboard')) {
        return Promise.resolve({ ok: true, json: async () => leaderboardBody })
      }
      return Promise.resolve({ ok: false, json: async () => ({ error: 'fail' }) })
    })
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByText('Could not load stats. Please try again.')).toBeInTheDocument()
    })
  })

  it('renders the domain overview and leaderboard sections', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('domain-overview')).toBeInTheDocument())
    expect(screen.getByText(/Top Scorers/)).toBeInTheDocument()
  })
})
