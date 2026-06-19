'use client'

import type { ClientQuestion, CorrectAnswer } from '@/lib/types'

interface QuizQuestionProps {
  question: ClientQuestion
  questionNumber: number
  totalQuestions: number
  selected: CorrectAnswer | null
  onSelect: (answer: CorrectAnswer) => void
}

const OPTIONS: { key: CorrectAnswer; label: string }[] = [
  { key: 'A', label: 'option_a' },
  { key: 'B', label: 'option_b' },
  { key: 'C', label: 'option_c' },
  { key: 'D', label: 'option_d' },
]

export default function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  selected,
  onSelect,
}: QuizQuestionProps) {
  return (
    <div className="select-none">
      {/* Progress label */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-4">
        Question {questionNumber} of {totalQuestions}
      </p>

      {/* Question text */}
      <p
        className="text-base font-semibold text-neutral-900 mb-6 leading-relaxed"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-2.5">
        {OPTIONS.map(({ key, label }) => {
          const optionText = question[label as keyof ClientQuestion] as string
          const isSelected = selected === key

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg border text-left transition-all group ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50'
              }`}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {/* Letter label — always visible */}
              <span
                className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                  isSelected
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {key}
              </span>

              {/* Option text — hidden until hover or selected */}
              <span
                className={`text-sm text-neutral-700 transition-all duration-200 ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                aria-label={`Option ${key}: ${optionText}`}
              >
                {optionText}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
