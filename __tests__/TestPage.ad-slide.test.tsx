import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// The ad slide's trigger question is randomized per attempt — mock it to a
// fixed value so tests are deterministic. PROMO_AD_SLIDE_ENABLED is pinned to
// true here rather than left to fall through from the real module: this
// suite exercises the ad slide's own wiring, so it shouldn't silently start
// skipping coverage whenever the live kill-switch happens to be off.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
  PROMO_AD_SLIDE_ENABLED: true,
  pickAdSlideTriggerIndex: jest.fn(),
}))

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { PROMO_AD_SLIDE_FACTS, pickAdSlideTriggerIndex } from '@/lib/promo'

const mockUseSession = useSession as jest.Mock
const mockUseParams = useParams as jest.Mock
const mockUseRouter = useRouter as jest.Mock
const mockPickTrigger = pickAdSlideTriggerIndex as jest.Mock

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

describe('TestPage ad slide', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    global.fetch = jest.fn()
    // Index 6 (fires after answering the 7th question) is comfortably inside
    // the valid {5,6,7,8} range.
    mockPickTrigger.mockReset()
    mockPickTrigger.mockReturnValue(6)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('appears once at the (mocked) trigger question in place of a question, blocks advancing until skipped, and never reappears', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 6 }) })

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    // Answer Q1-Q6 (currentIndex 0-5) — ad slide must not appear yet, trigger
    // is mocked to fire after currentIndex 6 (Q7).
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
      expect(screen.queryByTestId('promo-ad-slide')).not.toBeInTheDocument()
    }
    expect(screen.getByText('Question 6?')).toBeInTheDocument()
    expect(screen.getByText('7 / 10')).toBeInTheDocument()

    // Answering Q7 (currentIndex 6) and clicking Next shows the ad slide
    // instead of advancing to Q8.
    fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))

    expect(screen.getByTestId('promo-ad-slide')).toBeInTheDocument()
    expect(screen.getByTestId('quiz-timer-paused-label')).toBeInTheDocument()
    expect(screen.getByText('7 / 10')).toBeInTheDocument() // currentIndex has not advanced
    expect(screen.queryByText('Question 7?')).not.toBeInTheDocument()
    // No question-card chrome (counter or options) bleeds into the ad slide.
    expect(screen.queryByText(/Question \d+ of 10/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Option A/i })).not.toBeInTheDocument()
    expect(screen.getByText(PROMO_AD_SLIDE_FACTS[0])).toBeInTheDocument()

    // Skip it
    fireEvent.click(screen.getByRole('button', { name: /Skip Ad/i }))
    expect(screen.queryByTestId('promo-ad-slide')).not.toBeInTheDocument()
    expect(screen.queryByTestId('quiz-timer-paused-label')).not.toBeInTheDocument()
    expect(screen.getByText('Question 7?')).toBeInTheDocument()
    expect(screen.getByText('8 / 10')).toBeInTheDocument()

    // Never reappears for the rest of the same attempt
    for (let i = 7; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
      expect(screen.queryByTestId('promo-ad-slide')).not.toBeInTheDocument()
    }
    await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())
  })

  it('excludes time spent on the ad slide from the recorded time_taken_seconds', async () => {
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
    expect(screen.getByTestId('promo-ad-slide')).toBeInTheDocument()

    // A real, noticeable delay before skipping — this is the "dead time"
    // that must NOT leak into the recorded quiz duration.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    fireEvent.click(screen.getByRole('button', { name: /Skip Ad/i }))

    // Finish the rest of the quiz as fast as possible
    for (let i = 7; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
    }

    await waitFor(() => expect(screen.getByText('Test Complete!')).toBeInTheDocument())

    const resultsCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/results')
    const body = JSON.parse(resultsCall[1].body)
    // Actual question-answering time in this test is near-instant, so once
    // the ~1.5s ad-slide pause is correctly excluded, the recorded duration
    // should be at most 1 second (real-timer/render overhead, not the pause)
    // — not 2+, which is what it'd be if the pause leaked into the
    // wall-clock time_taken calculation.
    expect(body.time_taken_seconds).toBeLessThanOrEqual(1)
  }, 10000)

  it('re-triggers once on a Try Again retake, at a freshly resolved trigger point', async () => {
    mockPickTrigger.mockReturnValueOnce(6).mockReturnValueOnce(7)

    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse()) // attempt 1 questions
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 5 }) }) // attempt 1 submit
      .mockResolvedValueOnce(mockQuestionsResponse()) // attempt 2 (retake) questions

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    // Attempt 1 — trigger is 6: answer through Q6, hit the ad slide at Q7, skip, finish.
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
    }
    fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
    expect(screen.getByTestId('promo-ad-slide')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Skip Ad/i }))

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
    expect(screen.queryByTestId('promo-ad-slide')).not.toBeInTheDocument()
    expect(screen.getByText('Question 7?')).toBeInTheDocument()

    // But Q8 (currentIndex 7) does fire it this time.
    fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next Question/i }))
    expect(screen.getByTestId('promo-ad-slide')).toBeInTheDocument()
  })
})
