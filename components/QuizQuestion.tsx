'use client'

import type { ClientQuestion, CorrectAnswer } from '@/lib/types'
import { NO_SELECT_STYLE } from '@/lib/anti-cheat'

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
      {/* Progress */}
      <p className="text-sm text-gray-400 mb-3">
        Question {questionNumber} of {totalQuestions}
      </p>

      {/* Question text — no copy */}
      <p
        className="text-lg font-semibold text-gray-900 mb-6 leading-relaxed"
        style={NO_SELECT_STYLE}
      >
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-3">
        {OPTIONS.map(({ key, label }) => {
          const optionText = question[label as keyof ClientQuestion] as string
          const isSelected = selected === key

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all group ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
              }`}
              style={NO_SELECT_STYLE}
            >
              {/* Letter label — always visible */}
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}
              >
                {key}
              </span>

              {/* Option text — hidden until hover or selected */}
              <span
                className={`text-gray-700 text-sm transition-all duration-200 ${
                  isSelected
                    ? 'opacity-100'
                    : '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
                }`}
                style={NO_SELECT_STYLE}
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
