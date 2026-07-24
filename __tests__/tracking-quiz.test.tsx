jest.mock('@/lib/analytics', () => ({ trackEvent: jest.fn() }))
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useParams: jest.fn(), useRouter: jest.fn() }))
// Pin both promo surfaces off so their randomized triggers can't interrupt the
// straight run through the quiz this suite needs.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_INTERSTITIAL_ENABLED: false,
  PROMO_AD_SLIDE_ENABLED: false,
}))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'
import { trackEvent } from '@/lib/analytics'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'

const mockTrackEvent = trackEvent as jest.Mock
const mockUseSession = useSession as jest.Mock
const mockUseParams = useParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock

function makeQuestion(i: number) {
  return { id: `q-${i}`, question: `Question ${i}?`, option_a: `A${i}`, option_b: `B${i}`, option_c: `C${i}`, option_d: `D${i}` }
}
function mockQuestionsResponse(count = 10) {
  return { ok: true, json: async () => ({ attemptId: 'attempt-1', questions: Array.from({ length: count }, (_, i) => makeQuestion(i)) }) }
}

describe('TestPage tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    global.fetch = jest.fn()
  })
  afterEach(() => jest.restoreAllMocks())

  it('fires quiz_started when questions load', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockQuestionsResponse())
    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())
    expect(mockTrackEvent).toHaveBeenCalledWith('quiz_started', { domain: 'devops' })
  })

  it('fires quiz_completed and result_viewed when the quiz is finished', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 7 }) })
    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
    }

    await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
    expect(mockTrackEvent).toHaveBeenCalledWith('quiz_completed', { domain: 'devops', score: 7 })
    expect(mockTrackEvent).toHaveBeenCalledWith('result_viewed', { domain: 'devops', score: 7 })
  })
})
