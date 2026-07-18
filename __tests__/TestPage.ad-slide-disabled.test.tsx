import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TestPage from '@/app/test/[domain]/page'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}))

// Ad slide off (its real default since the promo moved to the results
// screen) — proves the flag actually gates the surface rather than it
// always rendering regardless.
jest.mock('@/lib/promo', () => ({
  ...jest.requireActual('@/lib/promo'),
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

describe('TestPage with the ad slide disabled', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSession.mockReturnValue({ status: 'authenticated' })
    mockUseParams.mockReturnValue({ domain: 'devops' })
    mockUseRouter.mockReturnValue({ push: jest.fn() })
    global.fetch = jest.fn()
  })

  it('never shows the ad slide across a full attempt', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockQuestionsResponse())
      .mockResolvedValueOnce({ ok: true, json: async () => ({ score: 4 }) })

    render(<TestPage />)
    await waitFor(() => expect(screen.getByText('Question 0?')).toBeInTheDocument())

    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
      fireEvent.click(screen.getByRole('button', { name: /Next Question|Submit Test/i }))
      expect(screen.queryByTestId('promo-ad-slide')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Skip Ad/i })).not.toBeInTheDocument()
    }

    await waitFor(() => expect(screen.getByText('Your benchmark')).toBeInTheDocument())
  })
})
