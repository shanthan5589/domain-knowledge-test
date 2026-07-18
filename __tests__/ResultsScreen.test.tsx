import { render, screen, fireEvent } from '@testing-library/react'
import ResultsScreen from '@/components/ResultsScreen'
import type { Domain } from '@/lib/types'

// next/navigation is mocked because the "Dashboard" button pushes via
// useRouter. The push spy is asserted below.
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

import { useRouter } from 'next/navigation'
const mockUseRouter = useRouter as jest.Mock

describe('ResultsScreen', () => {
  const push = jest.fn()
  const onTryAgain = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push })
  })

  it('shows the score, domain label, and score tier for an average result', () => {
    render(<ResultsScreen domain="ai" score={6} onTryAgain={onTryAgain} />)

    expect(screen.getByText('Your benchmark')).toBeInTheDocument()
    expect(screen.getByText('Artificial Intelligence & Generative AI')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
  })

  it('picks the right tier label at each score band', () => {
    const cases: { score: number; label: string }[] = [
      { score: 10, label: 'Excellent' },
      { score: 9, label: 'Excellent' },
      { score: 8, label: 'Good' },
      { score: 7, label: 'Good' },
      { score: 6, label: 'Average' },
      { score: 5, label: 'Average' },
      { score: 4, label: 'Needs improvement' },
      { score: 0, label: 'Needs improvement' },
    ]
    for (const { score, label } of cases) {
      const { unmount } = render(
        <ResultsScreen domain="ai" score={score} onTryAgain={onTryAgain} />
      )
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })

  describe('domain-based CTA routing', () => {
    it('shows the training CTA button for AI domain', () => {
      render(<ResultsScreen domain="ai" score={7} onTryAgain={onTryAgain} />)
      expect(screen.getByRole('link', { name: /See training programs/i })).toBeInTheDocument()
    })

    it('shows the training CTA button for Data Science domain', () => {
      render(<ResultsScreen domain="data_science" score={7} onTryAgain={onTryAgain} />)
      expect(screen.getByRole('link', { name: /See training programs/i })).toBeInTheDocument()
    })

    it('shows the automation CTA button for every ops-heavy domain', () => {
      const opsDomains: Domain[] = ['cloud', 'devops', 'cybersecurity']
      for (const domain of opsDomains) {
        const { unmount } = render(
          <ResultsScreen domain={domain} score={7} onTryAgain={onTryAgain} />
        )
        expect(
          screen.getByRole('link', { name: /See automation solutions/i })
        ).toBeInTheDocument()
        unmount()
      }
    })
  })

  describe('tier-aware pitch copy', () => {
    // Pitch line changes with the score so a high scorer doesn't get told
    // to "close this gap" after being told they're ahead of most peers.
    // Pitch is score-only (not domain-tied), so the button below carries
    // the domain routing on its own — the two concerns stay cleanly split.
    // Each snippet is unique to its tier so tests can fingerprint it
    // without hard-coding the whole sentence.
    const tierFingerprints: Record<number, RegExp> = {
      10: /bring your whole team to this level/i,
      8: /take the next step with castor ai/i,
      6: /turn practice into pattern/i,
      3: /close this gap/i,
    }

    it('renders the tier-specific pitch for each score band', () => {
      for (const [score, pattern] of Object.entries(tierFingerprints)) {
        const { unmount } = render(
          <ResultsScreen domain="ai" score={Number(score)} onTryAgain={onTryAgain} />
        )
        expect(screen.getByText(pattern)).toBeInTheDocument()
        unmount()
      }
    })

    it('uses the same pitch line regardless of domain, for a given score', () => {
      // Domain drives the button destination, not the pitch — so an AI
      // quiz and a DevOps quiz at the same score must produce the same
      // pitch line. Pins the "pitch is score-only" contract so a future
      // edit re-tying it to domain will fail loudly.
      const domains: Domain[] = ['ai', 'data_science', 'cloud', 'devops', 'cybersecurity']
      for (const domain of domains) {
        const { unmount } = render(
          <ResultsScreen domain={domain} score={10} onTryAgain={onTryAgain} />
        )
        expect(screen.getByText(/bring your whole team to this level/i)).toBeInTheDocument()
        unmount()
      }
    })

    it('does NOT show the "close this gap" line to a high scorer', () => {
      // Regression pin: the original single-pitch copy told excellent
      // scorers to close a gap that didn't exist, which read as patronizing
      // and hurt trust with senior engineers. Never do that again.
      render(<ResultsScreen domain="ai" score={10} onTryAgain={onTryAgain} />)
      expect(screen.queryByText(/close this gap/i)).not.toBeInTheDocument()
    })
  })

  describe('Castor CTA link', () => {
    it('opens in a new tab with noopener rel and utm-tagged url', () => {
      render(<ResultsScreen domain="devops" score={5} onTryAgain={onTryAgain} />)
      const cta = screen.getByTestId('results-castor-cta') as HTMLAnchorElement
      expect(cta).toHaveAttribute('target', '_blank')
      expect(cta.rel).toContain('noopener')
      expect(cta.rel).toContain('noreferrer')
      const href = new URL(cta.href)
      expect(href.hostname).toBe('castorai.in')
      expect(href.searchParams.get('utm_source')).toBe('edu')
      expect(href.searchParams.get('utm_medium')).toBe('quiz_results')
      // utm_content carries variant + domain so results-screen conversions
      // can be split by which domain/CTA drove the click.
      expect(href.searchParams.get('utm_content')).toBe('automation_devops')
    })
  })

  describe('share button removed', () => {
    // LinkedIn share intentionally isn't rendered — LinkedIn blocks
    // pre-filled compose text from external sites, so any "share" button
    // would force the user to paste manually. Replaced by the
    // add-to-LinkedIn certificate flow (see TODO). This test pins the removal
    // so a future refactor doesn't silently reintroduce it.
    it('does not render a LinkedIn share button on the results screen', () => {
      render(<ResultsScreen domain="ai" score={8} onTryAgain={onTryAgain} />)
      expect(screen.queryByTestId('results-share-linkedin')).not.toBeInTheDocument()
      expect(screen.queryByText(/Share on LinkedIn/i)).not.toBeInTheDocument()
    })
  })

  describe('secondary actions', () => {
    it('calls onTryAgain when the Try again button is clicked', () => {
      render(<ResultsScreen domain="ai" score={4} onTryAgain={onTryAgain} />)
      fireEvent.click(screen.getByRole('button', { name: /Try again/i }))
      expect(onTryAgain).toHaveBeenCalledTimes(1)
    })

    it('routes to the dashboard when Dashboard is clicked', () => {
      render(<ResultsScreen domain="ai" score={4} onTryAgain={onTryAgain} />)
      fireEvent.click(screen.getByRole('button', { name: /Dashboard/i }))
      expect(push).toHaveBeenCalledWith('/dashboard')
    })
  })
})
