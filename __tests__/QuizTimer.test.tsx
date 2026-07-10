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

  it('calls onExpire only once even if the callback triggers a parent re-render', () => {
    // Simulate the real-world scenario: onExpire changes on every render
    // (e.g. parent updates state/phase in response to expiry), which used
    // to cause the effect to re-run while remaining was still 0.
    const onExpire = jest.fn()
    const { rerender } = render(<QuizTimer totalSeconds={1} onExpire={onExpire} />)
    advanceSeconds(1)
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Re-render with a new onExpire reference and let more time pass —
    // the guard should prevent a second call.
    const onExpire2 = jest.fn()
    rerender(<QuizTimer totalSeconds={1} onExpire={onExpire2} />)
    advanceSeconds(2)
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(onExpire2).not.toHaveBeenCalled()
  })

  it('does not call onExpire again after multiple re-renders while remaining stays at 0', () => {
    const onExpire = jest.fn()
    const { rerender } = render(<QuizTimer totalSeconds={1} onExpire={onExpire} />)
    advanceSeconds(1)
    expect(onExpire).toHaveBeenCalledTimes(1)

    // Force several extra re-renders with the same props
    rerender(<QuizTimer totalSeconds={1} onExpire={onExpire} />)
    rerender(<QuizTimer totalSeconds={1} onExpire={onExpire} />)
    rerender(<QuizTimer totalSeconds={1} onExpire={onExpire} />)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  describe('paused', () => {
    it('does not count down while paused', () => {
      render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} paused />)
      advanceSeconds(5)
      expect(screen.getByTestId('quiz-timer')).toHaveTextContent('5:00')
    })

    it('resumes from the same value (not reset) when unpaused', () => {
      const { rerender } = render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} />)
      advanceSeconds(10)
      expect(screen.getByTestId('quiz-timer')).toHaveTextContent('4:50')

      rerender(<QuizTimer totalSeconds={300} onExpire={jest.fn()} paused />)
      advanceSeconds(5)
      expect(screen.getByTestId('quiz-timer')).toHaveTextContent('4:50')

      rerender(<QuizTimer totalSeconds={300} onExpire={jest.fn()} paused={false} />)
      advanceSeconds(3)
      expect(screen.getByTestId('quiz-timer')).toHaveTextContent('4:47')
    })

    it('shows the paused label only while paused', () => {
      const { rerender } = render(<QuizTimer totalSeconds={300} onExpire={jest.fn()} />)
      expect(screen.queryByTestId('quiz-timer-paused-label')).not.toBeInTheDocument()

      rerender(<QuizTimer totalSeconds={300} onExpire={jest.fn()} paused />)
      expect(screen.getByTestId('quiz-timer-paused-label')).toHaveTextContent('Paused')

      rerender(<QuizTimer totalSeconds={300} onExpire={jest.fn()} paused={false} />)
      expect(screen.queryByTestId('quiz-timer-paused-label')).not.toBeInTheDocument()
    })

    it('does not call onExpire while paused even past the would-be-zero point, then calls it once after unpausing', () => {
      const onExpire = jest.fn()
      const { rerender } = render(<QuizTimer totalSeconds={2} onExpire={onExpire} paused />)
      advanceSeconds(5)
      expect(onExpire).not.toHaveBeenCalled()

      rerender(<QuizTimer totalSeconds={2} onExpire={onExpire} paused={false} />)
      advanceSeconds(2)
      expect(onExpire).toHaveBeenCalledTimes(1)
    })
  })
})
