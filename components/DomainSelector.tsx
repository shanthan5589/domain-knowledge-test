'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DOMAINS = [
  {
    id: 'ai',
    name: 'Artificial Intelligence & Generative AI',
    description: 'LLMs, prompt engineering, model APIs, AI concepts',
    abbr: 'AI',
  },
  {
    id: 'cloud',
    name: 'Cloud Computing',
    description: 'AWS, Azure, GCP services and architecture',
    abbr: 'CC',
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Threats, tools, protocols, and best practices',
    abbr: 'CS',
  },
  {
    id: 'devops',
    name: 'DevOps & CI/CD',
    description: 'Pipelines, containers, Kubernetes, automation',
    abbr: 'DO',
  },
  {
    id: 'data_science',
    name: 'Data Science, Analytics & Big Data',
    description: 'ML, data pipelines, SQL, visualization tools',
    abbr: 'DS',
  },
]

export default function DomainSelector() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  function handleSelect(id: string) {
    setSelected(id)
    setConfirming(true)
  }

  function handleCancel() {
    setSelected(null)
    setConfirming(false)
  }

  function handleConfirm() {
    router.push(`/test/${selected}`)
  }

  const selectedDomain = DOMAINS.find((d) => d.id === selected)

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOMAINS.map((domain) => (
          <button
            key={domain.id}
            onClick={() => handleSelect(domain.id)}
            className="bg-white border border-neutral-200 rounded-lg p-5 text-left hover:border-neutral-400 hover:shadow-sm transition-all group"
          >
            <div className="w-8 h-8 bg-neutral-100 rounded-md flex items-center justify-center mb-3">
              <span className="text-[10px] font-bold text-neutral-600">{domain.abbr}</span>
            </div>
            <h2 className="text-sm font-semibold text-neutral-800 mb-1 leading-snug">
              {domain.name}
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">{domain.description}</p>
          </button>
        ))}
      </div>

      {/* Confirmation modal */}
      {confirming && selectedDomain && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-neutral-200 rounded-lg p-8 max-w-sm w-full shadow-lg">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-3">
              Selected domain
            </p>
            <h2 className="text-lg font-bold text-neutral-900 mb-1">
              {selectedDomain.name}
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              10 questions &middot; 5 minute timer &middot; Cannot pause
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleCancel}
                className="flex-1 border border-neutral-200 rounded-lg py-2.5 text-sm text-neutral-700 font-medium hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-neutral-900 hover:bg-black text-white rounded-lg py-2.5 text-sm font-medium transition"
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
