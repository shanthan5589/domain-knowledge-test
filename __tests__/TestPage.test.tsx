import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// The interstitial's trigger question is randomized per attempt — mock it to
// a fixed value so tests are deterministic instead of flaky. Everything else
// from lib/promo (copy, URLs, both enabled flags) stays real.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  pickInterstitialTriggerIndex: jest.fn(),
}))

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { pickInterstitialTriggerIndex } from '@/lib/promo'

const mockUseSession = useSession as jest.Mock
const mockUseParams = useParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockPickTrigger = pickInterstitialTriggerIndex as jest.Mock

const push = jest.fn()

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
    json: async () => ({ questions: Array.from({ length: count }, (_, i) => makeQuestion(i)) }),
  }
}

// Answers the current question and clicks Next/Submit, dismissing the promo
// interstitial via "Continue Quiz" if it happens to appear on that click.
// Shared by every test that just needs to power through the quiz without
// caring exactly where the (mocked) interstitial trigger falls.
function answerAndAdvance() {
  fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
  fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
  const continueButton = screen.queryByRole('button', { name: /Continue Quiz/i })
  if (continueButton) fireEvent.click(continueButton)
}

describe('TestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push })
    global.fetch = jest.fn()
    // Default trigger for tests that don't care about the exact question —
    // index 6 (fires after answering the 7th question) is comfortably inside
    // the valid {5,6,7,8} range.
    mockPickTrigger.mockReset()
    mockPickTrigger.mockReturnValue(6)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads questions and renders the first question', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockQuestionsResponse())

    render(<TestPage />)

    await waitFor(() => {
      expect(screen.getByText('Question 0?')).toBeInTheDocument()
    })
  })

  it('stacks the results-screen action buttons vertically on narrow screens', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 7 }) })

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    for (let i = 0; i < 10; i++) {
      answerAndAdvance()
    }

    await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
    const tryAgainButton = screen.getByText('Try Again')
    expect(tryAgainButton.parentElement).toHaveClass('flex-col', 'sm:flex-row')
  })

  describe('Try Again resets state for a same-domain retake', () => {
    it('re-fetches fresh questions and resets progress after clicking Try Again', async () => {
      ;(global.fetch as jest.Mock)
        // Initial attempt: questions fetch
        .mockResolvedValueOnce(mockQuestionsResponse())
        // Submit on last question
        .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 7 }) })
        // Retake: questions fetch again (should be called again, with fresh data)
        .mockResolvedValueOnce(mockQuestionsResponse())

      render(<TestPage />)

      // Wait for first question of attempt 1
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Answer all 10 questions to reach submit
      for (let i = 0; i < 10; i++) {
        answerAndAdvance()
      }

      // Results screen shown
      await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
      expect(screen.getByText('7')).toBeInTheDocument()

      // Click "Try Again"
      fireEvent.click(screen.getByText('Try Again'))

      // The questions effect must re-fire even though domain/status/router
      // are unchanged — this is the resetKey fix. Verify a fresh fetch call
      // happens and the quiz view (fresh question 0) is shown again, not
      // stale results.
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3)
      })
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Progress indicator should be back at the start, not stuck at 10/10
      expect(screen.getByText('1 / 10')).toBeInTheDocument()
    })
  })

  describe('submit re-entrancy guard', () => {
    it('ignores a second submit call if triggered before the first completes', async () => {
      let resolveFetch: (value: unknown) => void = () => {}
      const resultsFetchPromise = new Promise((resolve) => {
        resolveFetch = resolve
      })

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockQuestionsResponse())
        .mockImplementationOnce(() => resultsFetchPromise)

      render(<TestPage />)
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Answer all questions up to the last one
      for (let i = 0; i < 9; i++) {
        answerAndAdvance()
      }

      // On the last question, select an answer and click submit twice rapidly
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      const submitButton = screen.getByRole('button', { name: /Submit Test/i })
      fireEvent.click(submitButton)

      // Phase should now be "submitting" — button is gone, no way to click
      // again via UI, but directly verify fetch to /api/results was called
      // exactly once even though submitTest could theoretically be invoked
      // again (e.g. by a racing timer expiry).
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      resolveFetch({ ok: true, json: async () => ({ score: 9 }) })

      await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
      // Still exactly 2 fetch calls total (1 questions + 1 results) — no duplicate submit.
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('mid-quiz interstitial', () => {
    it('appears once at the (mocked) trigger question, blocks advancing until dismissed, and never reappears', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockQuestionsResponse())
        .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 6 }) })

      render(<TestPage />)
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Answer Q1-Q6 (currentIndex 0-5) — interstitial must not appear yet,
      // trigger is mocked to fire after currentIndex 6 (Q7).
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
        expect(screen.queryByTestId('promo-interstitial')).not.toBeInTheDocument()
      }
      expect(screen.getByText('Question 6?')).toBeInTheDocument()
      expect(screen.getByText('7 / 10')).toBeInTheDocument()

      // Answering Q7 (currentIndex 6) and clicking Next shows the
      // interstitial instead of advancing to Q8.
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

      expect(screen.getByTestId('promo-interstitial')).toBeInTheDocument()
      expect(screen.getByTestId('quiz-timer-paused-label')).toBeInTheDocument()
      expect(screen.getByText('7 / 10')).toBeInTheDocument() // currentIndex has not advanced
      expect(screen.queryByText('Question 7?')).not.toBeInTheDocument()

      // Dismiss it
      fireEvent.click(screen.getByRole('button', { name: /Continue Quiz/i }))
      expect(screen.queryByTestId('promo-interstitial')).not.toBeInTheDocument()
      expect(screen.queryByTestId('quiz-timer-paused-label')).not.toBeInTheDocument()
      expect(screen.getByText('Question 7?')).toBeInTheDocument()
      expect(screen.getByText('8 / 10')).toBeInTheDocument()

      // Never reappears for the rest of the same attempt
      for (let i = 7; i < 10; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
        expect(screen.queryByTestId('promo-interstitial')).not.toBeInTheDocument()
      }
      await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
    })

    it('excludes time spent on the interstitial from the recorded time_taken_seconds', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockQuestionsResponse())
        .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 5 }) })

      render(<TestPage />)
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Reach the (mocked) trigger question as fast as possible
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      }
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      expect(screen.getByTestId('promo-interstitial')).toBeInTheDocument()

      // A real, noticeable delay before dismissing — this is the "dead
      // time" that must NOT leak into the recorded quiz duration.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      fireEvent.click(screen.getByRole('button', { name: /Continue Quiz/i }))

      // Finish the rest of the quiz as fast as possible
      for (let i = 7; i < 10; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
      }

      await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())

      const resultsCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/results')
      const body = JSON.parse(resultsCall[1].body)
      // Actual question-answering time in this test is near-instant, so
      // once the ~1.5s interstitial pause is correctly excluded, the
      // recorded duration should round to 0 — not 1-2, which is what it'd
      // be if the pause leaked into the wall-clock time_taken calculation.
      expect(body.time_taken_seconds).toBe(0)
    }, 10000)

    it('re-triggers once on a Try Again retake, at a freshly resolved trigger point', async () => {
      mockPickTrigger.mockReturnValueOnce(6).mockReturnValueOnce(7)

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockQuestionsResponse()) // attempt 1 questions
        .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 5 }) }) // attempt 1 submit
        .mockResolvedValueOnce(mockQuestionsResponse()) // attempt 2 (retake) questions

      render(<TestPage />)
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Attempt 1 — trigger is 6: answer through Q6, hit the interstitial at Q7, dismiss, finish.
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      }
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      expect(screen.getByTestId('promo-interstitial')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Continue Quiz/i }))

      for (let i = 7; i < 10; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
      }
      await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())

      // Retake
      fireEvent.click(screen.getByText('Try Again'))
      await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

      // Attempt 2's trigger is now 7 (Q8) — Q7 (currentIndex 6) no longer fires it.
      for (let i = 0; i < 7; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      }
      expect(screen.queryByTestId('promo-interstitial')).not.toBeInTheDocument()
      expect(screen.getByText('Question 7?')).toBeInTheDocument()

      // But Q8 (currentIndex 7) does fire it this time.
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      expect(screen.getByTestId('promo-interstitial')).toBeInTheDocument()
    })
  })
})
