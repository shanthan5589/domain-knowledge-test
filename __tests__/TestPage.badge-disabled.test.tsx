import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Badge off, interstitial explicitly pinned on, trigger index pinned for
// determinism — proves the two switches are independent regardless of
// whatever PROMO_INTERSTITIAL_ENABLED happens to be set to live. Continue
// delay zeroed out since this test uses real timers and isn't testing the
// gating countdown itself. Ad slide is also pinned off so its independent
// randomized trigger can't interfere with this suite's fixed interstitial
// trigger index.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_BADGE_ENABLED: false,
  PROMO_INTERSTITIAL_ENABLED: true,
  pickInterstitialTriggerIndex: jest.fn(() => 5),
  PROMO_CONTINUE_DELAY_SECONDS: 0,
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

describe('TestPage with only the badge disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    global.fetch = jest.fn()
  })

  it('never shows the badge (header or results screen), but still shows the interstitial once at its trigger', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 3 }) })

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    expect(screen.queryByText('Powered by Castor AI')).not.toBeInTheDocument()

    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
    }
    fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    expect(screen.getByTestId('promo-interstitial')).toBeInTheDocument()
    expect(screen.queryByText('Powered by Castor AI')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Continue Quiz/i }))
    for (let i = 6; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
    }

    await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
    expect(screen.queryByText('Powered by Castor AI')).not.toBeInTheDocument()
  })
})
