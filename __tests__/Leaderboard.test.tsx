import { render, screen, waitFor } from '@testing-library/react'
import Leaderboard from '@/components/Leaderboard'

global.fetch = jest.fn()
const mockFetch = fetch as jest.Mock

const noFilters = { designation: 'all', experience: 'all', country: 'all', state_region: 'all', city: 'all' }

describe('Leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches the leaderboard for the given domain', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leaderboard: [] }) })
    render(<Leaderboard domain="cloud" {...noFilters} />)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=cloud'))
    })
  })

  it('renders ranked entries with scores', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leaderboard: [
          { name: 'Alice', score: 10, isYou: false },
          { name: 'Bob', score: 8, isYou: true },
        ],
      }),
    })
    render(<Leaderboard domain="ai" {...noFilters} />)
    await waitFor(() => expect(screen.getByTestId('leaderboard')).toBeInTheDocument())
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('10/10')).toBeInTheDocument()
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
    expect(screen.getByText('8/10')).toBeInTheDocument()
  })

  it('marks the current user\'s entry', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ leaderboard: [{ name: 'Bob', score: 8, isYou: true }] }),
    })
    render(<Leaderboard domain="ai" {...noFilters} />)
    await waitFor(() => expect(screen.getByText(/\(you\)/)).toBeInTheDocument())
  })

  it('shows an empty-state message when nobody has attempted the domain', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leaderboard: [] }) })
    render(<Leaderboard domain="devops" {...noFilters} />)
    await waitFor(() => {
      expect(screen.getByText('No attempts yet for this domain.')).toBeInTheDocument()
    })
  })

  it('refetches when the domain prop changes', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ leaderboard: [] }) })
    const { rerender } = render(<Leaderboard domain="ai" {...noFilters} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=ai')))
    rerender(<Leaderboard domain="devops" {...noFilters} />)
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('domain=devops')))
  })

  it('includes the crowd filters in the request', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ leaderboard: [] }) })
    render(
      <Leaderboard
        domain="ai"
        designation="Data Scientist"
        experience="all"
        country="India"
        state_region="Telangana"
        city="all"
      />
    )
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('designation=Data+Scientist'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('country=India'))
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('state_region=Telangana'))
    })
  })

  it('shows an error message when the fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'fail' }) })
    render(<Leaderboard domain="ai" {...noFilters} />)
    await waitFor(() => {
      expect(screen.getByText('Could not load the leaderboard.')).toBeInTheDocument()
    })
  })
})
