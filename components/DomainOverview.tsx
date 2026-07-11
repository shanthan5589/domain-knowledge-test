'use client'

import { useEffect, useState } from 'react'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS_SHORT as DOMAIN_LABELS } from '@/lib/domains'
import { crowdFilterParams } from '@/lib/crowd-filter-params'
import ScoreGauge from '@/components/ui/ScoreGauge'

interface OverviewResponse {
  averageScoreByDomain: Partial<Record<Domain, number | null>>
  attemptCounts: Partial<Record<Domain, number>>
  mostAttemptedDomain: Domain | null
}

interface Props {
  designation: string
  experience: string
  country: string
  state_region: string
  city: string
}

export default function DomainOverview({ designation, experience, country, state_region, city }: Props) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchOverview() {
      try {
        const params = new URLSearchParams(crowdFilterParams({ designation, experience, country, state_region, city }))
        const res = await fetch(`/api/stats/overview?${params}`)
        if (!res.ok) throw new Error('Failed to load overview')
        const json = await res.json()
        if (cancelled) return
        setData(json)
        setError('')
      } catch {
        if (!cancelled) setError('Could not load domain averages.')
      }
    }

    fetchOverview()
    return () => {
      cancelled = true
    }
  }, [designation, experience, country, state_region, city])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!data) return <p className="text-[var(--ink-soft)] text-sm animate-pulse">Loading domain averages…</p>

  return (
    // Flex-wrap (not a fixed-column grid) so five domain cards never leave a
    // ragged, half-empty trailing row — whatever doesn't fit on a line grows
    // to fill it evenly, at every viewport width.
    <div data-testid="domain-overview" className="flex flex-wrap gap-4">
      {ALL_DOMAINS.map((d) => {
        const avg = data.averageScoreByDomain[d]
        const count = data.attemptCounts[d] ?? 0
        const isMostAttempted = data.mostAttemptedDomain === d

        return (
          <div key={d} className="min-w-[220px] flex-1 bg-[var(--surface)] rounded-lg border border-[var(--line)] p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-[var(--ink-soft)] uppercase tracking-wide">{DOMAIN_LABELS[d]}</p>
              {isMostAttempted && (
                <span
                  className="text-[10px] font-semibold text-[var(--action)] bg-[var(--paper)] px-2 py-0.5 rounded-full flex-shrink-0"
                  data-testid="most-attempted-badge"
                >
                  Most attempted
                </span>
              )}
            </div>
            <p className="font-mono text-2xl font-bold text-[var(--ink)]">
              {avg ?? '—'}
              <span className="text-sm font-medium text-[var(--ink-soft)] font-sans"> / 10 avg</span>
            </p>
            {typeof avg === 'number' && (
              <div className="mt-2">
                <ScoreGauge score={avg} />
              </div>
            )}
            <p className="text-xs text-[var(--ink-soft)] mt-2">
              {count} test-taker{count === 1 ? '' : 's'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
