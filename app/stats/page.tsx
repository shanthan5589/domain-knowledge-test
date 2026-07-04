'use client'

import { useEffect, useState, useCallback } from 'react'
import UserMenu from '@/components/UserMenu'
import type { Domain } from '@/lib/types'

const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'Artificial Intelligence & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science, Analytics & Big Data',
}

const ALL_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

const DESIGNATION_OPTIONS = [
  'Software Engineer / Developer',
  'Full-Stack Developer',
  'Data Scientist',
  'Cloud Architect / Engineer',
  'DevOps Engineer',
  'Cybersecurity Specialist',
  'AI / Machine Learning Engineer',
  'UI/UX Designer',
  'IT Project Manager',
  'Product Owner',
  'Business Analyst',
  'Other',
]

// Below this many test-takers, a histogram is too sparse to be meaningful (and risks
// exposing an individual's score), so we show a message instead of a chart.
const MIN_SAMPLE_SIZE = 5

interface StatsResponse {
  histogram: number[]
  totalUsers: number
  yourScore: number | null
}

export default function StatsPage() {
  const [domain, setDomain] = useState<Domain>('ai')
  const [designation, setDesignation] = useState('all')
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ domain, designation })
      const res = await fetch(`/api/stats?${params}`)
      if (!res.ok) throw new Error('Failed to load stats')
      const json = await res.json()
      setData(json)
    } catch {
      setError('Could not load stats. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [domain, designation])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const maxPercent =
    data && data.totalUsers > 0 ? Math.max(...data.histogram.map((c) => (c / data.totalUsers) * 100)) : 0

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Domain Knowledge Test</span>
        <UserMenu />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Stats</h1>
        <p className="text-gray-500 mb-8">See how your score compares to others</p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="stats-domain" className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <select
              id="stats-domain"
              aria-label="Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as Domain)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {ALL_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="stats-designation" className="block text-sm font-medium text-gray-700 mb-1">
              Compare against
            </label>
            <select
              id="stats-designation"
              aria-label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">All designations</option>
              {DESIGNATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {loading && <p className="text-gray-400 text-sm animate-pulse">Loading stats…</p>}
          {!loading && error && <p className="text-red-600 text-sm">{error}</p>}

          {!loading && !error && data && data.totalUsers < MIN_SAMPLE_SIZE && (
            <p className="text-gray-500 text-sm text-center py-10" data-testid="stats-empty">
              Not enough data yet for this filter ({data.totalUsers} {data.totalUsers === 1 ? 'result' : 'results'}
              ). Try a broader filter.
            </p>
          )}

          {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
            <div data-testid="stats-chart">
              <p className="text-xs text-gray-400 mb-4">
                Based on {data.totalUsers} test-taker{data.totalUsers === 1 ? '' : 's'}
              </p>
              <div className="flex items-end gap-2 h-56">
                {data.histogram.map((count, score) => {
                  const percent = (count / data.totalUsers) * 100
                  const heightPercent = maxPercent > 0 ? (percent / maxPercent) * 100 : 0
                  const isYou = data.yourScore === score
                  return (
                    <div
                      key={score}
                      className="flex-1 flex flex-col items-center justify-end h-full"
                      data-testid={`score-bar-${score}`}
                    >
                      {isYou && (
                        <span
                          className="mb-1 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0"
                          title="Your score"
                          data-testid="you-marker"
                        >
                          You
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t-md ${isYou ? 'bg-blue-500' : 'bg-gray-300'}`}
                        style={{ height: `${heightPercent}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                      <span className="text-[11px] text-gray-500 mt-2">{score}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">Score (out of 10)</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
