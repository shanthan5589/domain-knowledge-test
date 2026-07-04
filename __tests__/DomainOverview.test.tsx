import { render, screen, waitFor } from '@testing-library/react'
import DomainOverview from '@/components/DomainOverview'

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

describe('DomainOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows a loading state before data arrives', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<DomainOverview />)
    expect(screen.getByText('Loading domain averages…')).toBeInTheDocument()
  })

  it('renders an average score card for every domain', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        averageScoreByDomain: { ai: 7.5, cloud: 6, cybersecurity: null, devops: 5.2, data_science: 8 },
        attemptCounts: { ai: 4, cloud: 2, cybersecurity: 0, devops: 3, data_science: 1 },
        mostAttemptedDomain: 'ai',
      }),
    })
    render(<DomainOverview />)
    await waitFor(() => expect(screen.getByTestId('domain-overview')).toBeInTheDocument())
    expect(screen.getByText('7.5')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument() // cybersecurity has no data yet
  })

  it('badges the most-attempted domain', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        averageScoreByDomain: { ai: 7, cloud: 6, cybersecurity: 5, devops: 5, data_science: 5 },
        attemptCounts: { ai: 10, cloud: 2, cybersecurity: 1, devops: 1, data_science: 1 },
        mostAttemptedDomain: 'ai',
      }),
    })
    render(<DomainOverview />)
    await waitFor(() => expect(screen.getByTestId('most-attempted-badge')).toBeInTheDocument())
  })

  it('shows an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'fail' }) })
    render(<DomainOverview />)
    await waitFor(() => {
      expect(screen.getByText('Could not load domain averages.')).toBeInTheDocument()
    })
  })
})
