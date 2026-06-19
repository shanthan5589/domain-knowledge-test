'use client'

import { useEffect, useState, useRef } from 'react'

interface QuizTimerProps {
  totalSeconds: number
  onExpire: () => void
}

export default function QuizTimer({ totalSeconds, onExpire }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current()
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
      data-testid="quiz-timer"
      className={`font-mono text-xl font-bold tabular-nums ${
        isUrgent ? 'text-red-500 animate-pulse' : 'text-neutral-700'
      }`}
    >
      {display}
    </div>
  )
}
