'use client'

import { useEffect, useState, useRef } from 'react'

interface QuizTimerProps {
  totalSeconds: number
  onExpire: () => void
}

export default function QuizTimer({ totalSeconds, onExpire }: QuizTimerProps) {
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
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`
  const isUrgent = remaining <= 60

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${
        isUrgent ? 'border-red-200 bg-red-50' : 'border-[var(--line)] bg-[var(--paper)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isUrgent ? 'bg-red-600 animate-pulse' : 'bg-[var(--signal)]'}`}
        aria-hidden="true"
      />
      <div
        data-testid="quiz-timer"
        className={`font-mono text-2xl font-bold tabular-nums ${
          isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-700'
        }`}
      >
        {display}
      </div>
    </div>
  )
}
