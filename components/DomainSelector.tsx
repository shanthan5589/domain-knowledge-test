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

const DOMAINS = ALL_DOMAINS.map((id, index) => ({
  id,
  index: index + 1,
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
            className="bg-[var(--surface)] rounded-lg border border-[var(--line)] p-6 text-left hover:border-[var(--action)] hover:shadow-md transition-all group"
          >
            <span className="font-mono text-xs text-[var(--signal)] mb-2 block">
              {String(domain.index).padStart(2, '0')}
            </span>
            <h2 className="font-semibold text-[var(--ink)] mb-1 min-h-[48px] flex items-start">
              {domain.name}
            </h2>
            <p className="text-sm text-[var(--ink-soft)]">{domain.description}</p>
          </button>
        ))}
      </div>

      {/* Confirmation modal */}
      {confirming && selectedDomain && (
        <div className="fixed inset-0 bg-[var(--ink)]/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--surface)] rounded-xl p-8 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-[var(--ink)] text-center mb-2">
              Ready to start?
            </h2>
            <p className="text-[var(--ink)] text-center mb-1">
              <span className="font-medium">{selectedDomain.name}</span>
            </p>
            <p className="text-[var(--ink-soft)] text-sm text-center mb-6 font-mono">
              10 questions · 5 minute timer · Cannot pause
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 border border-[var(--line)] rounded-md py-3 text-[var(--ink)] font-medium hover:border-[var(--ink)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-[var(--action)] text-white rounded-md py-3 font-medium hover:bg-[var(--action-hover)] transition-colors"
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
