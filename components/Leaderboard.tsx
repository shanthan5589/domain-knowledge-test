'use client'

import { useEffect, useState } from 'react'
import type { Domain } from '@/lib/types'
import { crowdFilterParams } from '@/lib/crowd-filter-params'

interface LeaderboardEntry {
  name: string
  score: number
  isYou: boolean
}

interface Props {
  domain: Domain
  designation: string
  experience: string
  country: string
  state_region: string
  city: string
}

export default function Leaderboard({ domain, designation, experience, country, state_region, city }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  // Set only when the API withheld names because too few people matched the
  // active filters — lets us tell that case apart from "nobody has attempted
  // this domain yet", which otherwise look identical (both are an empty list).
  const [suppressedCount, setSuppressedCount] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchLeaderboard() {
      try {
        const params = new URLSearchParams({
          domain,
          limit: '5',
          ...crowdFilterParams({ designation, experience, country, state_region, city }),
        })
        const res = await fetch(`/api/stats/leaderboard?${params}`)
        if (!res.ok) throw new Error('Failed to load leaderboard')
        const json = await res.json()
        if (cancelled) return
        setEntries(json.leaderboard)
        setSuppressedCount(typeof json.suppressedCount === 'number' ? json.suppressedCount : null)
        setError('')
      } catch {
        if (!cancelled) setError('Could not load the leaderboard.')
      }
    }

    fetchLeaderboard()
    return () => {
      cancelled = true
    }
  }, [domain, designation, experience, country, state_region, city])

  if (error) return <p className="text-red-600 text-sm">{error}</p>
  if (!entries) return <p className="text-[var(--ink-soft)] text-sm animate-pulse">Loading leaderboard…</p>
  if (entries.length === 0 && suppressedCount !== null) {
    return (
      <p className="text-[var(--ink-soft)] text-sm">
        {suppressedCount} {suppressedCount === 1 ? 'person matches' : 'people match'} these filters — not enough to
        show names safely. Try broader filters.
      </p>
    )
  }
  if (entries.length === 0) return <p className="text-[var(--ink-soft)] text-sm">No attempts yet for this domain.</p>

  return (
    <ol data-testid="leaderboard" className="divide-y divide-[var(--line)]">
      {entries.map((entry, i) => (
        <li
          key={`${entry.name}-${i}`}
          className={`flex items-center justify-between py-2.5 px-2 rounded-md ${entry.isYou ? 'bg-[var(--signal-soft)]' : ''}`}
        >
          <span className="flex items-center gap-3">
            <span className="w-6 font-mono text-sm font-semibold text-[var(--ink-soft)]">{i + 1}</span>
            <span className={`text-sm ${entry.isYou ? 'font-semibold text-[var(--action)]' : 'text-[var(--ink)]'}`}>
              {entry.name}
              {entry.isYou ? ' (you)' : ''}
            </span>
          </span>
          <span className="font-mono text-sm font-bold text-[var(--ink)]">{entry.score}/10</span>
        </li>
      ))}
    </ol>
  )
}
