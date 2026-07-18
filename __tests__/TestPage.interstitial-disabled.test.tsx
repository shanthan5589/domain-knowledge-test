import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Interstitial off, badge explicitly on — proves the two switches are
// independent, not one flag pretending to be two. Badge defaults to off in
// lib/promo.ts, so this test opts it in explicitly rather than relying on
// the real default. Ad slide pinned off so it can't randomly interrupt this
// suite's plain click-through regardless of its live default.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_INTERSTITIAL_ENABLED: false,
  PROMO_BADGE_ENABLED: true,
  PROMO_AD_SLIDE_ENABLED: false,
}))

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'

const mockUseSession = useSession as jest.Mock
const mockUseParams = useParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock

function makeQuestion(i: number) {
  return {
    id: `q-${i}`,
    question: `Question ${i}?`,
    option_a: `A${i}`,
    option_b: `B${i}`,
    option_c: `C${i}`,
    option_d: `D${i}`,
  }
}

function mockQuestionsResponse(count = 10) {
  return {
    ok: true,
    json: async () => ({
      attemptId: 'attempt-1',
      questions: Array.from({ length: count }, (_, i) => makeQuestion(i)),
    }),
  }
}

describe('TestPage with only the interstitial disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    global.fetch = jest.fn()
  })

  it('still shows the passive badge but never the interstitial', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 4 }) })

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    expect(screen.getByText('Powered by Castor AI')).toBeInTheDocument()

    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
      expect(screen.queryByTestId('promo-interstitial')).not.toBeInTheDocument()
    }

    // The results screen has its own dedicated Castor CTA card (see
    // components/ResultsScreen.tsx) so the passive badge is no longer
    // rendered there — the big CTA card would make it redundant.
    await waitFor(() => expect(screen.getByText('Your benchmark')).toBeInTheDocument())
    expect(screen.queryByText('Powered by Castor AI')).not.toBeInTheDocument()
    expect(screen.getByTestId('results-castor-cta')).toBeInTheDocument()
  })
})
