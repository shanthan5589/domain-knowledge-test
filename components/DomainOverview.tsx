'use client'

import { useEffect, useState } from 'react'
import type { Domain } from '@/lib/types'

const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'AI & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science & Analytics',
}

const ALL_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

interface OverviewResponse {
  averageScoreByDomain: Partial<Record<Domain, number | null>>
  attemptCounts: Partial<Record<Domain, number>>
  mostAttemptedDomain: Domain | null
}

export default function DomainOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchOverview() {
      try {
        const res = await fetch('/api/stats/overview')
        if (!res.ok) throw new Error('Failed to load overview')
        const json = await res.json()
        if (cancelled) return
        setData(json)
      } catch {
        if (!cancelled) setError('Could not load domain averages.')
      }
    }

    fetchOverview()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!data) return <p className="text-gray-400 text-sm animate-pulse">Loading domain averages…</p>

  return (
    <div data-testid="domain-overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {ALL_DOMAINS.map((d) => {
        const avg = data.averageScoreByDomain[d]
        const count = data.attemptCounts[d] ?? 0
        const isMostAttempted = data.mostAttemptedDomain === d

        return (
          <div key={d} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{DOMAIN_LABELS[d]}</p>
              {isMostAttempted && (
                <span
                  className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0"
                  data-testid="most-attempted-badge"
                >
                  Most attempted
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">
              {avg ?? '—'}
              <span className="text-sm font-medium text-gray-400"> / 10 avg</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {count} test-taker{count === 1 ? '' : 's'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
