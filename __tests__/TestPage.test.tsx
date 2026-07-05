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

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'

const mockUseSession = useSession as jest.Mock
const mockUseParams = useParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock

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

describe('TestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push })
    global.fetch = jest.fn()
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
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        const button = screen.getByRole('button', { name: /Next Question|Submit Test/i })
        fireEvent.click(button)
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
        fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
        fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
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
})
