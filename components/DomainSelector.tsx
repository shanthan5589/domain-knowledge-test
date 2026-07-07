'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS } from '@/lib/domains'

// Marketing-style blurbs shown under each domain name — not duplicated
// anywhere else, so they stay local to this component.
const DOMAIN_DESCRIPTIONS: Record<Domain, string> = {
  ai: 'LLMs, prompt engineering, model APIs, AI concepts',
  cloud: 'AWS, Azure, GCP services and architecture',
  cybersecurity: 'Threats, tools, protocols, and best practices',
  devops: 'Pipelines, containers, Kubernetes, automation',
  data_science: 'ML, data pipelines, SQL, visualization tools',
}

const DOMAINS = ALL_DOMAINS.map((id) => ({
  id,
  name: DOMAIN_LABELS[id],
  description: DOMAIN_DESCRIPTIONS[id],
}))

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOMAINS.map((domain) => (
          <button
            key={domain.id}
            onClick={() => handleSelect(domain.id)}
            className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <h2 className="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors min-h-[48px] flex items-start">
              {domain.name}
            </h2>
            <p className="text-sm text-gray-500">{domain.description}</p>
          </button>
        ))}
      </div>

      {/* Confirmation modal */}
      {confirming && selectedDomain && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Ready to start?
            </h2>
            <p className="text-gray-600 text-center mb-1">
              <span className="font-medium">{selectedDomain.name}</span>
            </p>
            <p className="text-gray-500 text-sm text-center mb-6">
              10 questions · 5 minute timer · Cannot pause
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 border border-gray-300 rounded-lg py-3 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition"
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
