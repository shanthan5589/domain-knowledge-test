import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
  yourRank: number | null
  percentile: number | null
  averageScore: number | null
  medianScore: number | null
  modeScore: number | null
  topScore: number | null
  lowScore: number | null
  averageTimeSeconds: number | null
  topScoreCount: number
  topScorePercent: number
  roleDistribution: { label: string; count: number; percent: number }[]
  roleAverageScores: { label: string; count: number; averageScore: number }[]
  experienceAverageScores: { label: string; count: number; averageScore: number }[]
  experienceDistribution: { label: string; count: number; percent: number }[]
  locationDistribution: { label: string; count: number; percent: number }[]
  locationAverageScores: { label: string; count: number; averageScore: number }[]
  locationDistributionLabel: string | null
  locationComparisons: { label: string; scope: string; averageScore: number | null; count: number }[]
  userProgress: {
    attemptCount: number
    latestScore: number | null
    previousScore: number | null
    scoreChange: number | null
    bestScore: number | null
    latestTimeSeconds: number | null
    averageTimePerQuestionSeconds: number | null
    scorePerMinute: number | null
    latestCompletedAt: string | null
    consistency: {
      label: string
      averageScore: number | null
      scoreRange: number | null
      standardDeviation: number | null
    }
  }
}> = {}) {
  return {
    histogram: [0, 0, 0, 0, 0, 1, 0, 1, 2, 0, 1],
    totalUsers: 5,
    yourScore: 10,
    yourRank: 1,
    percentile: 80,
    averageScore: 8,
    medianScore: 8,
    modeScore: 8,
    topScore: 10,
    lowScore: 5,
    averageTimeSeconds: 252,
    topScoreCount: 1,
    topScorePercent: 20,
    roleDistribution: [
      { label: 'Software Engineer / Developer', count: 3, percent: 60 },
      { label: 'Data Scientist', count: 2, percent: 40 },
    ],
    roleAverageScores: [
      { label: 'Software Engineer / Developer', count: 3, averageScore: 8.5 },
      { label: 'Data Scientist', count: 2, averageScore: 6 },
    ],
    experienceAverageScores: [
      { label: '10+ years', count: 2, averageScore: 10 },
      { label: '5-10 years', count: 1, averageScore: 8 },
      { label: '1-3 years', count: 3, averageScore: 7 },
      { label: '3-5 years', count: 2, averageScore: 7 },
      { label: 'Fresher', count: 1, averageScore: 5 },
    ],
    experienceDistribution: [
      { label: '1-3 years', count: 4, percent: 80 },
      { label: '3-5 years', count: 1, percent: 20 },
    ],
    locationDistribution: [
      { label: 'India', count: 5, percent: 100 },
    ],
    locationAverageScores: [
      { label: 'India', count: 5, averageScore: 8 },
    ],
    locationDistributionLabel: 'Countries',
    locationComparisons: [
      { label: 'Hyderabad', scope: 'City', averageScore: 8.2, count: 3 },
      { label: 'India', scope: 'Country', averageScore: 8, count: 5 },
      { label: 'Global', scope: 'Global', averageScore: 7.4, count: 12 },
    ],
    userProgress: {
      attemptCount: 3,
      latestScore: 10,
      previousScore: 8,
      scoreChange: 2,
      bestScore: 10,
      latestTimeSeconds: 220,
      averageTimePerQuestionSeconds: 22,
      scorePerMinute: 2.7,
      latestCompletedAt: '2026-01-04',
      consistency: {
        label: 'Stable',
        averageScore: 8.7,
        scoreRange: 2,
        standardDeviation: 0.9,
      },
    },
    ...overrides,
  }
}

const overviewBody = {
  averageScoreByDomain: { ai: 7, cloud: null, cybersecurity: null, devops: null, data_science: null },
  attemptCounts: { ai: 5, cloud: 0, cybersecurity: 0, devops: 0, data_science: 0 },
  mostAttemptedDomain: 'ai',
  userLatestScoreByDomain: { ai: 10, cloud: 6, cybersecurity: 4, devops: null, data_science: 8 },
  userBestScoreByDomain: { ai: 10, cloud: 7, cybersecurity: 4, devops: null, data_science: 9 },
  userAttemptCountsByDomain: { ai: 3, cloud: 2, cybersecurity: 1, devops: 0, data_science: 2 },
}

const leaderboardBody = { leaderboard: [] }

// StatsPage itself fetches /api/stats, while its DomainOverview and Leaderboard
// children each fetch their own endpoint — route mocked responses by URL so all
// three get a shape they can actually render.
function installFetchMock(
  stats: object = statsBody(),
  profile: object = { profile: {} }
) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/profile')) {
      return Promise.resolve({ ok: true, json: async () => profile })
    }
    if (url.includes('/api/stats/overview')) {
      return Promise.resolve({ ok: true, json: async () => overviewBody })
    }
    if (url.includes('/api/stats/leaderboard')) {
      return Promise.resolve({ ok: true, json: async () => leaderboardBody })
    }
    return Promise.resolve({ ok: true, json: async () => stats })
  })
}

function openMoreFilters() {
  fireEvent.click(screen.getByRole('button', { name: /more filters/i }))
}

// The effect's own setState calls land a couple of microtask ticks after the fetch
// call is recorded, so tests that only assert on the fetch call args (not a DOM
// change) need to flush those ticks inside act() before the test tears down.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
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
    // Let the fetch's state updates land inside act() before the test tears down
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
  })

  it('defaults the community filters to the saved profile location', async () => {
    installFetchMock(statsBody(), {
      profile: {
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      },
    })
    render(<StatsPage />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('country=India'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state_region=Telangana'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('city=Hyderabad'))
    })
    expect(screen.getByRole('heading', { name: 'Hyderabad Benchmark' })).toBeInTheDocument()
  })

  it('defaults to the Community Insights tab with Domain, Designation and Experience visible', async () => {
    installFetchMock()
    render(<StatsPage />)
    expect(screen.getByRole('tab', { name: 'Community Insights' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Domain')).toBeInTheDocument()
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    expect(screen.getByLabelText('Experience')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
  })

  it('shows a link back to the dashboard', async () => {
    installFetchMock()
    render(<StatsPage />)
    expect(screen.getByRole('link', { name: /back to dashboard/i })).toHaveAttribute('href', '/dashboard')
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
  })

  it('hides the location filters until "More filters" is clicked', async () => {
    installFetchMock()
    render(<StatsPage />)
    expect(screen.queryByLabelText('Country')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    openMoreFilters()
    expect(screen.getByLabelText('Country')).toBeInTheDocument()
    expect(screen.getByLabelText('State or Region')).toBeInTheDocument()
    expect(screen.getByLabelText('City')).toBeInTheDocument()
  })

  it('state and city dropdowns start disabled until a country/state is chosen', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
    openMoreFilters()
    expect(screen.getByLabelText('State or Region')).toBeDisabled()
    expect(screen.getByLabelText('City')).toBeDisabled()
  })

  it('shows the chart once data is loaded', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('stats-chart')).toBeInTheDocument()
    })
  })

  it('shows crowd averages in the chart header and demographic breakdowns', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
    expect(screen.getByTestId('chart-average')).toHaveTextContent('8/10')
    expect(screen.getByTestId('chart-top-score')).toHaveTextContent('Top score')
    expect(screen.getByTestId('chart-top-score')).toHaveTextContent('10/10')
    expect(screen.getByTestId('chart-top-score')).toHaveTextContent('1 persons')
    expect(screen.getByTestId('role-distribution')).toHaveTextContent('Roles')
    expect(screen.getByTestId('role-distribution')).toHaveTextContent('Software Engineer / Developer')
    expect(screen.getByTestId('experience-distribution')).toHaveTextContent('1-3 years')
    expect(screen.getByTestId('location-distribution')).toHaveTextContent('Countries taking this test')
    expect(screen.getByTestId('location-distribution')).toHaveTextContent('India')
    expect(screen.getByTestId('role-distribution-donut')).toBeInTheDocument()
    expect(screen.queryByTestId('experience-distribution-donut')).not.toBeInTheDocument()
    expect(screen.queryByTestId('location-distribution-donut')).not.toBeInTheDocument()
  })

  it('shows the crowd score snapshot strip with no descriptive captions', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('score-snapshot')).toBeInTheDocument())
    const snapshot = screen.getByTestId('score-snapshot')
    expect(snapshot).toHaveTextContent('Test-takers')
    expect(snapshot).toHaveTextContent('Your score')
    expect(snapshot).toHaveTextContent('Average')
    expect(snapshot).toHaveTextContent('Median')
    expect(snapshot).toHaveTextContent('Most common')
    expect(snapshot).toHaveTextContent('Lowest')
    expect(snapshot).toHaveTextContent('Top score')
    expect(snapshot).not.toHaveTextContent('Mean score here')
    expect(snapshot).not.toHaveTextContent('Reached by')
  })

  it('shows local place insights for rank, percentile, gaps, and profile comparisons', async () => {
    installFetchMock(statsBody(), {
      profile: {
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      },
    })
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('place-insights')).toBeInTheDocument())
    expect(screen.getByTestId('place-rank')).toHaveTextContent('#1 of 5')
    expect(screen.getByTestId('place-rank')).toHaveTextContent('Hyderabad')
    expect(screen.getByTestId('place-percentile')).toHaveTextContent('80%')
    expect(screen.getByTestId('place-average-gap')).toHaveTextContent(
      'You are 2 points higher than the Hyderabad average'
    )
    expect(screen.getByTestId('place-average-gap')).toHaveTextContent('Average score 8/10')
    expect(screen.getByTestId('place-top-gap')).toHaveTextContent('10/10')
    expect(screen.getByTestId('place-top-gap')).toHaveTextContent('You share the top score')
    expect(screen.getByTestId('place-role-gap')).toHaveTextContent('8.5/10')
    expect(screen.getByTestId('place-role-gap')).toHaveTextContent('Software Engineer / Developer')
    expect(screen.getByTestId('place-experience-gap')).toHaveTextContent('7/10')
    expect(screen.getByTestId('place-experience-gap')).toHaveTextContent('1-3 years')
    expect(screen.getByTestId('place-strongest-domain')).toHaveTextContent('10/10')
    expect(screen.getByTestId('place-hardest-domain')).toHaveTextContent('7/10')
  })

  it('shows progress, best score, time efficiency, and consistency panels', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('progress-panels')).toBeInTheDocument())
    const panels = screen.getByTestId('progress-panels')
    expect(panels).toHaveTextContent('Progress over time')
    expect(panels).toHaveTextContent('Previous 8/10')
    expect(panels).toHaveTextContent('Change +2')
    expect(panels).toHaveTextContent('Best vs latest')
    expect(panels).toHaveTextContent('3m 40s')
    expect(panels).toHaveTextContent('Community avg 4m 12s')
    expect(panels).toHaveTextContent('Stable')
  })

  it('shows the user domain strength ranking best to weakest', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('domain-strength-ranking')).toBeInTheDocument())
    const ranking = screen.getByTestId('domain-strength-ranking')
    expect(ranking).toHaveTextContent('Domain strength ranking')
    expect(ranking).toHaveTextContent('Artificial Intelligence & Generative AI')
    expect(ranking).toHaveTextContent('Data Science, Analytics & Big Data')
    expect(ranking).not.toHaveTextContent('Improve next')
  })

  it('shows local, country and global score comparisons', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('local-global-comparison')).toBeInTheDocument())
    const comparison = screen.getByTestId('local-global-comparison')
    expect(comparison).toHaveTextContent('Local vs global')
    expect(comparison).toHaveTextContent('Hyderabad')
    expect(comparison).toHaveTextContent('India')
    expect(comparison).toHaveTextContent('Global')
  })

  it('shows a dash for your score when the user has no score yet', async () => {
    installFetchMock(statsBody({ yourScore: null, yourRank: null, percentile: null }))
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('score-snapshot')).toBeInTheDocument())
    const label = screen.getByText('Your score')
    expect(label.nextElementSibling).toHaveTextContent('-')
  })

  it('shows a no-attempts message when nobody has taken the test yet', async () => {
    installFetchMock(statsBody({ totalUsers: 0, yourScore: null, yourRank: null, percentile: null }))
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('no-attempts-yet')).toBeInTheDocument())
    expect(screen.getByTestId('no-attempts-yet')).toHaveTextContent('be the first')
  })

  it('shows average score by designation as a bar chart', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('designation-score-chart')).toBeInTheDocument())
    const chart = screen.getByTestId('designation-score-chart')
    expect(chart).toHaveTextContent('Average score by designation')
    expect(chart).toHaveTextContent('Software Engineer / Developer')
    expect(chart).toHaveTextContent('8.5/10')
    expect(chart).toHaveTextContent('Data Scientist')
    expect(chart).toHaveTextContent('6/10')
  })

  it('shows average score by experience and location charts', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('experience-score-chart')).toBeInTheDocument())
    expect(screen.getByTestId('experience-score-chart')).toHaveTextContent('Average score by experience')
    expect(screen.getByTestId('experience-score-chart')).toHaveTextContent('1-3 years')
    expect(screen.getByTestId('location-score-chart')).toHaveTextContent('Average score by location')
    expect(screen.getByTestId('location-score-chart')).toHaveTextContent('India')
  })

  it('orders average score by experience from lowest to highest experience', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('experience-score-chart')).toBeInTheDocument())
    const chart = screen.getByTestId('experience-score-chart')
    const text = chart.textContent ?? ''
    expect(text.indexOf('Fresher')).toBeLessThan(text.indexOf('1-3 years'))
    expect(text.indexOf('1-3 years')).toBeLessThan(text.indexOf('3-5 years'))
    expect(text.indexOf('3-5 years')).toBeLessThan(text.indexOf('5-10 years'))
    expect(text.indexOf('5-10 years')).toBeLessThan(text.indexOf('10+ years'))
  })

  it('shows a no-data message in the designation chart when there is nothing to show', async () => {
    installFetchMock(statsBody({ roleAverageScores: [] }))
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('designation-score-chart')).toBeInTheDocument())
    expect(screen.getByTestId('designation-score-chart')).toHaveTextContent('No data yet.')
  })

  it('does not duplicate role distribution when viewing one city', async () => {
    installFetchMock(
      statsBody({
        locationDistribution: [],
        locationDistributionLabel: null,
      }),
      {
        profile: {
          country: 'India',
          state_region: 'Telangana',
          city: 'Hyderabad',
        },
      }
    )
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('role-distribution')).toBeInTheDocument())
    expect(screen.queryByTestId('location-distribution')).not.toBeInTheDocument()
  })

  it('labels both chart axes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())
    expect(screen.getByText('Test-takers (%)')).toBeInTheDocument()
    expect(screen.getByText('Score (out of 10)')).toBeInTheDocument()
  })

  it("highlights the bar matching the user's score", async () => {
    installFetchMock(statsBody({ yourScore: 8 }))
    render(<StatsPage />)
    await waitFor(() => {
      expect(screen.getByTestId('you-marker')).toBeInTheDocument()
    })
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
    await flushMicrotasks()
  })

  it('refetches when the designation dropdown changes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Data Scientist' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('designation=Data+Scientist'))
    })
    await flushMicrotasks()
  })

  it('refetches when the experience dropdown changes', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    fireEvent.change(screen.getByLabelText('Experience'), { target: { value: '5-10 years' } })
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('experience=5-10+years'))
    })
    await flushMicrotasks()
  })

  it('cascades country -> state -> city and sends human-readable names', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    openMoreFilters()

    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'IN' } })
    expect(screen.getByLabelText('State or Region')).not.toBeDisabled()

    fireEvent.change(screen.getByLabelText('State or Region'), { target: { value: 'TG' } })
    expect(screen.getByLabelText('City')).not.toBeDisabled()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('country=India'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state_region=Telangana'))
    })
    await flushMicrotasks()
  })

  it('shows an active-filter count on the "More filters" toggle once collapsed again', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    openMoreFilters()
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'IN' } })
    fireEvent.click(screen.getByRole('button', { name: /hide filters/i }))
    expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
    expect(screen.getByTestId('filter-count-badge')).toHaveTextContent('1')
    await flushMicrotasks()
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

  it('switches to the Domain Overview tab and hides the performance chart', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Domain Overview' }))
    await waitFor(() => expect(screen.getByTestId('domain-overview')).toBeInTheDocument())
    expect(screen.queryByTestId('stats-chart')).not.toBeInTheDocument()
  })

  it('switches to the Leaderboard tab and hides the performance chart', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Leaderboard' }))
    await waitFor(() => expect(screen.getByText(/Top scorers in/)).toBeInTheDocument())
    expect(screen.queryByTestId('stats-chart')).not.toBeInTheDocument()
  })

  it('keeps Designation, Experience and More filters visible on the Domain Overview tab', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Domain Overview' }))
    await waitFor(() => expect(screen.getByTestId('domain-overview')).toBeInTheDocument())
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    expect(screen.getByLabelText('Experience')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
  })

  it('keeps Designation, Experience and More filters visible on the Leaderboard tab', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('tab', { name: 'Leaderboard' }))
    await waitFor(() => expect(screen.getByText(/Top scorers in/)).toBeInTheDocument())
    expect(screen.getByLabelText('Designation')).toBeInTheDocument()
    expect(screen.getByLabelText('Experience')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
  })

  it('passes the selected crowd filters through to the Domain Overview request', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Data Scientist' } })
    fireEvent.change(screen.getByLabelText('Experience'), { target: { value: '5-10 years' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Domain Overview' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/stats\/overview\?.*designation=Data\+Scientist/)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/stats\/overview\?.*experience=5-10\+years/)
      )
    })
    await flushMicrotasks()
  })

  it('passes the selected crowd filters through to the Leaderboard request', async () => {
    installFetchMock()
    render(<StatsPage />)
    await waitFor(() => expect(screen.getByTestId('stats-chart')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Designation'), { target: { value: 'Data Scientist' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Leaderboard' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/stats\/leaderboard\?.*designation=Data\+Scientist/)
      )
    })
    await flushMicrotasks()
  })
})
