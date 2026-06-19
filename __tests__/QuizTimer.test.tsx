import { render, screen, act } from '@testing-library/react'
import QuizTimer from '@/components/QuizTimer'

jest.useFakeTimers()

// Advance n seconds one tick at a time so React effects re-run between each tick
function advanceSeconds(n: number) {
  for (let i = 0; i < n; i++) {
    act(() => { jest.advanceTimersByTime(1000) })
  }
}

describe('QuizTimer', () => {
  afterEach(() => {
    jest.clearAllTimers()
  })

  it('renders the initial time correctly', () => {
    render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} />)
    expect(screen.getByTestId('quiz-timer')).toHaveTextContent('5:00')
  })

  it('counts down by one second per tick', () => {
    render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} />)
    advanceSeconds(1)
    expect(screen.getByTestId('quiz-timer')).toHaveTextContent('4:59')
  })

  it('pads seconds with leading zero', () => {
    render(<QuizTimer totalSeconds={65} onExpire={jest.fn()} />)
    advanceSeconds(5)
    expect(screen.getByTestId('quiz-timer')).toHaveTextContent('1:00')
  })

  it('shows 0:00 when time is up', () => {
    render(<QuizTimer totalSeconds={3} onExpire={jest.fn()} />)
    advanceSeconds(3)
    expect(screen.getByTestId('quiz-timer')).toHaveTextContent('0:00')
  })

  it('calls onExpire when timer reaches zero', () => {
    const onExpire = jest.fn()
    render(<QuizTimer totalSeconds={2} onExpire={onExpire} />)
    advanceSeconds(3)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('does not call onExpire before time is up', () => {
    const onExpire = jest.fn()
    render(<QuizTimer totalSeconds={5} onExpire={onExpire} />)
    advanceSeconds(3)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('applies urgent styling when 60 seconds or less remain', () => {
    render(<QuizTimer totalSeconds={62} onExpire={jest.fn()} />)
    advanceSeconds(2)
    expect(screen.getByTestId('quiz-timer')).toHaveClass('text-red-600')
  })

  it('does not apply urgent styling when more than 60 seconds remain', () => {
    render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} />)
    expect(screen.getByTestId('quiz-timer')).toHaveClass('text-gray-700')
    expect(screen.getByTestId('quiz-timer')).not.toHaveClass('text-red-600')
  })

  it('displays single digit minutes correctly', () => {
    render(<QuizTimer totalSeconds={125} onExpire={jest.fn()} />)
    expect(screen.getByTestId('quiz-timer')).toHaveTextContent('2:05')
  })
})
