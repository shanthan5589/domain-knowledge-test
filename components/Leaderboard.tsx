'use client'

import { useEffect, useState } from 'react'
import type { Domain } from '@/lib/types'

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
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchLeaderboard() {
      try {
        const params = new URLSearchParams({ domain, limit: '5', designation, experience, country, state_region, city })
        const res = await fetch(`/api/stats/leaderboard?${params}`)
        if (!res.ok) throw new Error('Failed to load leaderboard')
        const json = await res.json()
        if (cancelled) return
        setEntries(json.leaderboard)
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
  if (!entries) return <p className="text-gray-400 text-sm animate-pulse">Loading leaderboard…</p>
  if (entries.length === 0) return <p className="text-gray-500 text-sm">No attempts yet for this domain.</p>

  return (
    <ol data-testid="leaderboard" className="divide-y divide-gray-100">
      {entries.map((entry, i) => (
        <li
          key={`${entry.name}-${i}`}
          className={`flex items-center justify-between py-2.5 px-2 rounded-lg ${entry.isYou ? 'bg-blue-50' : ''}`}
        >
          <span className="flex items-center gap-3">
            <span className="w-6 text-sm font-semibold text-gray-400">{i + 1}</span>
            <span className={`text-sm ${entry.isYou ? 'font-semibold text-blue-700' : 'text-gray-800'}`}>
              {entry.name}
              {entry.isYou ? ' (you)' : ''}
            </span>
          </span>
          <span className="text-sm font-bold text-gray-900">{entry.score}/10</span>
        </li>
      ))}
    </ol>
  )
}
