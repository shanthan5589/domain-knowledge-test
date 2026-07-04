'use client'

import { useEffect, useState } from 'react'
import { Country, State, City } from 'country-state-city'
import UserMenu from '@/components/UserMenu'
import DomainOverview from '@/components/DomainOverview'
import Leaderboard from '@/components/Leaderboard'
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

const EXPERIENCE_OPTIONS = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']

// Below this many test-takers, a histogram is too sparse to be meaningful (and risks
// exposing an individual's score), so we show a message instead of a chart.
const MIN_SAMPLE_SIZE = 5

const TABS = [
  { id: 'performance', label: 'My Performance' },
  { id: 'overview', label: 'Domain Overview' },
  { id: 'leaderboard', label: 'Leaderboard' },
] as const

type Tab = (typeof TABS)[number]['id']

interface StatsResponse {
  histogram: number[]
  totalUsers: number
  yourScore: number | null
  percentile: number | null
}

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>('performance')
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const [domain, setDomain] = useState<Domain>('ai')
  const [designation, setDesignation] = useState('all')
  const [experience, setExperience] = useState('all')
  const [countryCode, setCountryCode] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [city, setCity] = useState('')
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const states = countryCode ? State.getStatesOfCountry(countryCode) : []
  const cities = countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []

  const countryName = countryCode ? Country.getCountryByCode(countryCode)?.name ?? '' : ''
  const stateName = stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? '' : ''

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const params = new URLSearchParams({
          domain,
          designation,
          experience,
          country: countryName || 'all',
          state_region: stateName || 'all',
          city: city || 'all',
        })
        const res = await fetch(`/api/stats?${params}`)
        if (!res.ok) throw new Error('Failed to load stats')
        const json = await res.json()
        if (cancelled) return
        setData(json)
        setError('')
      } catch {
        if (cancelled) return
        setError('Could not load stats. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [domain, designation, experience, countryName, stateName, city])

  const maxPercent =
    data && data.totalUsers > 0 ? Math.max(...data.histogram.map((c) => (c / data.totalUsers) * 100)) : 0

  // Round the axis ceiling up to a clean multiple of 10 (min 20) so gridlines land on tidy numbers
  const yAxisMax = Math.max(20, Math.ceil(maxPercent / 10) * 10)
  const yAxisTicks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(yAxisMax * f))

  const activeFilterCount = [countryCode, stateCode, city].filter((v) => v !== '').length

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Domain Knowledge Test</span>
        <UserMenu />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Stats</h1>
        <p className="text-gray-500 mb-4">See how your score compares to others</p>

        {/* Domain + Designation share a row so the chart doesn't get pushed below the fold */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label htmlFor="stats-domain" className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <select
              id="stats-domain"
              aria-label="Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as Domain)}
              className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
            >
              {ALL_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label htmlFor="stats-designation" className="block text-sm font-medium text-gray-700 mb-1">
              Designation
            </label>
            <select
              id="stats-designation"
              aria-label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
            >
              <option value="all">All designations</option>
              {DESIGNATION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label htmlFor="stats-experience" className="block text-sm font-medium text-gray-700 mb-1">
              Experience
            </label>
            <select
              id="stats-experience"
              aria-label="Experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
            >
              <option value="all">All experience levels</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowMoreFilters((v) => !v)}
            aria-label={showMoreFilters ? 'Hide filters' : 'More filters'}
            title={showMoreFilters ? 'Hide filters' : 'More filters'}
            className={`relative flex items-center justify-center w-10 h-10 rounded-lg border transition flex-shrink-0 ${
              showMoreFilters
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-300 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {!showMoreFilters && activeFilterCount > 0 && (
              <span
                data-testid="filter-count-badge"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showMoreFilters && (
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-white rounded-xl border border-gray-100 p-4"
            data-testid="more-filters"
          >
            <div>
              <label htmlFor="stats-country" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="stats-country"
                aria-label="Country"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value)
                  setStateCode('')
                  setCity('')
                }}
                className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
              >
                <option value="">All countries</option>
                {Country.getAllCountries().map((c) => (
                  <option key={c.isoCode} value={c.isoCode}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stats-state" className="block text-sm font-medium text-gray-700 mb-1">
                State / Region
              </label>
              <select
                id="stats-state"
                aria-label="State or Region"
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value)
                  setCity('')
                }}
                disabled={!countryCode}
                className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All states / regions</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="stats-city" className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <select
                id="stats-city"
                aria-label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!stateCode}
                className="w-full border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 border-b border-gray-200 mb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* My Performance */}
        {tab === 'performance' && (
          <div>
            {/* Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {loading && <p className="text-gray-400 text-sm animate-pulse">Loading stats…</p>}
              {!loading && error && <p className="text-red-600 text-sm">{error}</p>}

              {!loading && !error && data && data.totalUsers < MIN_SAMPLE_SIZE && (
                <p className="text-gray-500 text-sm text-center py-10" data-testid="stats-empty">
                  Not enough data yet for this filter ({data.totalUsers}{' '}
                  {data.totalUsers === 1 ? 'result' : 'results'}). Try a broader filter.
                </p>
              )}

              {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
                <div data-testid="stats-chart">
                  <p className="text-xs text-black mb-4">
                    Based on {data.totalUsers} test-taker{data.totalUsers === 1 ? '' : 's'}
                  </p>

                  {data.yourScore !== null && data.percentile !== null && (
                    <p
                      className="text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg px-4 py-2 mb-4"
                      data-testid="percentile-callout"
                    >
                      You scored better than {data.percentile}% of this group in {DOMAIN_LABELS[domain]}.
                    </p>
                  )}

                  <div className="flex gap-3">
                    {/* Y-axis: percentage scale */}
                    <div className="flex flex-col justify-between h-56 text-xs text-black text-right">
                      {yAxisTicks.map((tick) => (
                        <span key={tick}>{tick}%</span>
                      ))}
                    </div>

                    {/* Bars + gridlines */}
                    <div className="flex-1 relative h-56">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {yAxisTicks.map((tick) => (
                          <div key={tick} className="border-t border-black w-full" />
                        ))}
                      </div>
                      <div className="relative flex items-end gap-2 h-full">
                        {data.histogram.map((count, score) => {
                          const percent = (count / data.totalUsers) * 100
                          const heightPercent = (percent / yAxisMax) * 100
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
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* X-axis: score labels, aligned under the bars */}
                  <div className="flex gap-3 mt-2">
                    <div className="w-8 flex-shrink-0" />
                    <div className="flex-1 flex gap-2">
                      {data.histogram.map((_, score) => (
                        <span key={score} className="flex-1 text-center text-[11px] text-black">
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-xs text-black mt-2">Score (out of 10)</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Domain Overview */}
        {tab === 'overview' && (
          <DomainOverview
            designation={designation}
            experience={experience}
            country={countryName || 'all'}
            state_region={stateName || 'all'}
            city={city || 'all'}
          />
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Top scorers in {DOMAIN_LABELS[domain]}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <Leaderboard
                domain={domain}
                designation={designation}
                experience={experience}
                country={countryName || 'all'}
                state_region={stateName || 'all'}
                city={city || 'all'}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
