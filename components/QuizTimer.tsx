'use client'

import { useEffect, useState, useRef } from 'react'

interface QuizTimerProps {
  totalSeconds: number
  onExpire: () => void
  // When true, the countdown holds at its current value and does not tick
  // down — used to freeze the timer while the mid-quiz promo interstitial
  // is open. Resumes from the exact same `remaining` value once cleared.
  paused?: boolean
}

export default function QuizTimer({ totalSeconds, onExpire, paused = false }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const onExpireRef = useRef(onExpire)
  const hasExpiredRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (remaining <= 0) {
      // Guard against calling onExpire more than once per timer instance —
      // without this, a re-render triggered by the expire callback itself
      // (e.g. parent changing phase) could re-run this effect while
      // `remaining` is still 0 and fire the callback again.
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true
        onExpireRef.current()
      }
      return
    }
    if (paused) return
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, paused])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`
  const isUrgent = remaining <= 60

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
        paused
          ? 'border-amber-300 bg-amber-50'
          : isUrgent
            ? 'border-red-200 bg-red-50'
            : 'border-[var(--line)] bg-[var(--paper)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          paused ? 'bg-amber-500' : isUrgent ? 'bg-red-600 animate-pulse' : 'bg-[var(--signal)]'
        }`}
        aria-hidden="true"
      />
      <div
        data-testid="quiz-timer"
        className={`font-mono text-2xl font-bold tabular-nums ${
          paused ? 'text-amber-600' : isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-700'
        }`}
      >
        {display}
      </div>
      {paused && (
        <span
          data-testid="quiz-timer-paused-label"
          className="font-mono text-[11px] font-semibold uppercase tracking-wide text-amber-600"
        >
          Paused
        </span>
      )}
    </div>
  )
}
