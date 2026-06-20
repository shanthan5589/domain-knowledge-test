'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import QuizTimer from '@/components/QuizTimer'
import QuizQuestion from '@/components/QuizQuestion'
import type { ClientQuestion, CorrectAnswer, Domain } from '@/lib/types'

const TOTAL_SECONDS = 300 // 5 minutes

const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'Artificial Intelligence & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science, Analytics & Big Data',
}

type Phase = 'loading' | 'quiz' | 'submitting' | 'results' | 'error'

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const domain = params.domain as Domain
  const { data: session, status } = useSession()

  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])
  const [questions, setQuestions] = useState<ClientQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, CorrectAnswer>>({})
  const [score, setScore] = useState<number | null>(null)
  const [startTime] = useState(Date.now())
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/questions/${domain}`)
        if (!res.ok) throw new Error('Failed to load questions')
        const data = await res.json()
        setQuestions(data.questions)
        setPhase('quiz')
      } catch {
        setErrorMessage('Could not load questions. Please try again.')
        setPhase('error')
      }
    }
    fetchQuestions()
  }, [domain])

  const submitTest = useCallback(
    async (finalAnswers: Record<string, CorrectAnswer>) => {
      setPhase('submitting')
      const timeTaken = Math.round((Date.now() - startTime) / 1000)
      try {
        const res = await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain,
            score: 0, // server calculates actual score
            time_taken_seconds: Math.min(timeTaken, TOTAL_SECONDS),
            answers: finalAnswers,
          }),
        })
        if (!res.ok) throw new Error('Failed to save results')
        const data = await res.json()
        setScore(typeof data.score === 'number' ? data.score : 0)
        setPhase('results')
      } catch {
        setErrorMessage('Could not save results. Please try again.')
        setPhase('error')
      }
    },
    [domain, startTime]
  )

  function handleTimerExpire() {
    submitTest(answers)
  }

  function handleSelect(answer: CorrectAnswer) {
    setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: answer }))
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      submitTest({ ...answers })
    }
  }

  const currentQuestion = questions[currentIndex]
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] ?? null : null
  const isLastQuestion = currentIndex === questions.length - 1

  // Auth loading or redirecting
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg animate-pulse">Loading…</p>
      </main>
    )
  }

  // Loading questions
  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg animate-pulse">Loading questions…</p>
      </main>
    )
  }

  // Error
  if (phase === 'error') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  // Results
  if (phase === 'results' && score !== null) {
    const passed = score >= 7
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Test Complete!</h1>
          <p className="text-gray-500 mb-6">{DOMAIN_LABELS[domain]}</p>
          <div className="mb-8">
            <span className="text-7xl font-black text-blue-600">{score}</span>
            <span className="text-3xl font-bold text-gray-400"> / 10</span>
          </div>
          <p className="text-gray-600 mb-8">
            {passed
              ? 'Great job! You have a solid understanding of this domain.'
              : 'Keep practicing — review the concepts and try again!'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 border border-gray-300 rounded-lg py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push(`/test/${domain}`)}
              className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Submitting
  if (phase === 'submitting') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg animate-pulse">Submitting your answers…</p>
      </main>
    )
  }

  // Quiz
  return (
    <main
      className="min-h-screen bg-gray-50"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600 hidden sm:inline">
            {DOMAIN_LABELS[domain]}
          </span>
          <span className="text-sm text-gray-400">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <QuizTimer totalSeconds={TOTAL_SECONDS} onExpire={handleTimerExpire} />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {currentQuestion && (
            <QuizQuestion
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selected={selectedAnswer}
              onSelect={handleSelect}
            />
          )}

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!selectedAnswer}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              {isLastQuestion ? 'Submit Test' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
