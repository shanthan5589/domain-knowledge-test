import { render, screen, fireEvent } from '@testing-library/react'
import QuizQuestion from '@/components/QuizQuestion'
import type { ClientQuestion } from '@/lib/types'

const mockQuestion: ClientQuestion = {
  id: 'test-id-1',
  question: 'Which command rolls back a deployment?',
  option_a: 'kubectl revert',
  option_b: 'kubectl rollout undo',
  option_c: 'kubectl rollback',
  option_d: 'kubectl deploy --undo',
}

describe('QuizQuestion', () => {
  const defaultProps = {
    question: mockQuestion,
    questionNumber: 1,
    totalQuestions: 10,
    selected: null,
    onSelect: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the question text', () => {
    render(<QuizQuestion {...defaultProps} />)
    expect(screen.getByText('Which command rolls back a deployment?')).toBeInTheDocument()
  })

  it('renders question progress indicator', () => {
    render(<QuizQuestion {...defaultProps} />)
    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument()
  })

  it('renders all four option letter labels (A, B, C, D)', () => {
    render(<QuizQuestion {...defaultProps} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('calls onSelect with the correct answer key when an option is clicked', () => {
    const onSelect = jest.fn()
    render(<QuizQuestion {...defaultProps} onSelect={onSelect} />)
    // Click option B button (find by aria-label)
    const optionB = screen.getByRole('button', { name: /Option B/i })
    fireEvent.click(optionB)
    expect(onSelect).toHaveBeenCalledWith('B')
  })

  it('calls onSelect with A when option A is clicked', () => {
    const onSelect = jest.fn()
    render(<QuizQuestion {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Option A/i }))
    expect(onSelect).toHaveBeenCalledWith('A')
  })

  it('calls onSelect with C when option C is clicked', () => {
    const onSelect = jest.fn()
    render(<QuizQuestion {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Option C/i }))
    expect(onSelect).toHaveBeenCalledWith('C')
  })

  it('calls onSelect with D when option D is clicked', () => {
    const onSelect = jest.fn()
    render(<QuizQuestion {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /Option D/i }))
    expect(onSelect).toHaveBeenCalledWith('D')
  })

  it('highlights the selected option with neutral border', () => {
    render(<QuizQuestion {...defaultProps} selected="B" />)
    const optionB = screen.getByRole('button', { name: /Option B/i })
    expect(optionB).toHaveClass('border-neutral-900')
  })

  it('non-selected options do not have neutral-900 border', () => {
    render(<QuizQuestion {...defaultProps} selected="B" />)
    const optionA = screen.getByRole('button', { name: /Option A/i })
    expect(optionA).not.toHaveClass('border-neutral-900')
  })

  it('shows updated question number when questionNumber prop changes', () => {
    const { rerender } = render(<QuizQuestion {...defaultProps} questionNumber={3} totalQuestions={10} />)
    expect(screen.getByText('Question 3 of 10')).toBeInTheDocument()
    rerender(<QuizQuestion {...defaultProps} questionNumber={7} totalQuestions={10} />)
    expect(screen.getByText('Question 7 of 10')).toBeInTheDocument()
  })

  it('option text is present in the DOM (for aria-label accessibility)', () => {
    render(<QuizQuestion {...defaultProps} />)
    expect(screen.getByLabelText(/Option A: kubectl revert/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Option B: kubectl rollout undo/i)).toBeInTheDocument()
  })

  it('renders all 4 option buttons', () => {
    render(<QuizQuestion {...defaultProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
  })
})
