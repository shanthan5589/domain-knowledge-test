'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QuizTimer from '@/components/QuizTimer'
import QuizQuestion from '@/components/QuizQuestion'
import type { ClientQuestion, CorrectAnswer, Domain } from '@/lib/types'

const TOTAL_SECONDS = 300

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

  const [phase, setPhase] = useState<Phase>('loading')
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
            score: 0,
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

  // Loading
  if (phase === 'loading') {
    return (
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p className="text-neutral-500 text-sm animate-pulse">Loading questions…</p>
      </main>
    )
  }

  // Error
  if (phase === 'error') {
    return (
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 text-sm font-medium mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-neutral-900 hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium transition"
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
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center px-4">
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-10 max-w-sm w-full text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-6">
            Test complete
          </p>
          <div className="mb-2">
            <span className="text-7xl font-black text-neutral-900">{score}</span>
            <span className="text-2xl font-bold text-neutral-400"> / 10</span>
          </div>
          <p className={`text-sm font-semibold mb-1 ${passed ? 'text-emerald-700' : 'text-red-500'}`}>
            {passed ? 'Passed' : 'Needs improvement'}
          </p>
          <p className="text-xs text-neutral-500 mb-2">{DOMAIN_LABELS[domain]}</p>
          <p className="text-sm text-neutral-600 mb-8">
            {passed
              ? 'Solid understanding of this domain.'
              : 'Review the concepts and try again.'}
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 border border-neutral-200 rounded-lg py-2.5 text-sm text-neutral-700 font-medium hover:bg-neutral-50 transition"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push(`/test/${domain}`)}
              className="flex-1 bg-neutral-900 hover:bg-black text-white rounded-lg py-2.5 text-sm font-medium transition"
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
      <main className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p className="text-neutral-500 text-sm animate-pulse">Submitting your answers…</p>
      </main>
    )
  }

  // Quiz
  return (
    <main
      className="min-h-screen bg-neutral-100"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 hidden sm:inline">
            {DOMAIN_LABELS[domain]}
          </span>
          <span className="text-xs text-neutral-400">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <QuizTimer totalSeconds={TOTAL_SECONDS} onExpire={handleTimerExpire} />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-200">
        <div
          className="h-0.5 bg-neutral-900 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8">
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
              className="bg-neutral-900 hover:bg-black text-white px-8 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isLastQuestion ? 'Submit Test' : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
