'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Country, State, City } from 'country-state-city'
import UserMenu from '@/components/UserMenu'
import AppHeader from '@/components/AppHeader'
import DomainOverview from '@/components/DomainOverview'
import Leaderboard from '@/components/Leaderboard'
import CommunityInsights from '@/components/stats/CommunityInsights'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS } from '@/lib/domains'
import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'
import { crowdFilterParams } from '@/lib/crowd-filter-params'
import type { PersonalStatsResponse, StatsResponse } from '@/lib/stats-types'

const TABS = [
  { id: 'performance', label: 'Community Insights' },
  { id: 'overview', label: 'Domain Overview' },
  { id: 'leaderboard', label: 'Leaderboard' },
] as const

type Tab = (typeof TABS)[number]['id']

function nameToCountryCode(name: string): string {
  if (!name) return ''
  return Country.getAllCountries().find((country) => country.name === name)?.isoCode ?? ''
}

function nameToStateCode(name: string, countryCode: string): string {
  if (!name || !countryCode) return ''
  return State.getStatesOfCountry(countryCode).find((state) => state.name === name)?.isoCode ?? ''
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
  const [personalData, setPersonalData] = useState<PersonalStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileLocationReady, setProfileLocationReady] = useState(false)

  const states = countryCode ? State.getStatesOfCountry(countryCode) : []
  const cities = countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []

  const countryName = countryCode ? Country.getCountryByCode(countryCode)?.name ?? '' : ''
  const stateName = stateCode ? State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? '' : ''

  useEffect(() => {
    let cancelled = false

    async function fetchProfileLocation() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) return
        const json = await res.json()
        const profile = json.profile
        const initialCountryCode = nameToCountryCode(profile?.country ?? '')
        const initialStateCode = nameToStateCode(profile?.state_region ?? '', initialCountryCode)

        if (!cancelled && initialCountryCode) {
          setCountryCode(initialCountryCode)
          setStateCode(initialStateCode)
          setCity(profile?.city ?? '')
        }
      } catch {
        // Profile location is only a convenience default; broad stats should still load.
      } finally {
        if (!cancelled) setProfileLocationReady(true)
      }
    }

    fetchProfileLocation()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      if (!profileLocationReady) return
      try {
        setLoading(true)
        const params = new URLSearchParams({
          domain,
          ...crowdFilterParams({
            designation,
            experience,
            country: countryName || 'all',
            state_region: stateName || 'all',
            city: city || 'all',
          }),
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
  }, [domain, designation, experience, countryName, stateName, city, profileLocationReady])

  // The cross-domain "You, over time" and Domain Radar widgets need the
  // user's own activity across every domain, not just the one selected above,
  // so this is a separate fetch keyed on city/country rather than domain.
  useEffect(() => {
    let cancelled = false

    async function fetchPersonalStats() {
      if (!profileLocationReady) return
      try {
        const params = new URLSearchParams({
          domain,
          city: city || 'all',
          country: countryName || 'all',
        })
        const res = await fetch(`/api/stats/personal?${params}`)
        if (!res.ok) throw new Error('Failed to load personal stats')
        const json = await res.json()
        if (!cancelled) setPersonalData(json)
      } catch {
        if (!cancelled) setPersonalData(null)
      }
    }

    fetchPersonalStats()
    return () => {
      cancelled = true
    }
  }, [domain, city, countryName, profileLocationReady])

  const activeFilterCount = [countryCode, stateCode, city].filter((v) => v !== '').length
  const communityScope = city || stateName || countryName || 'everyone'
  const hasSpecificCommunity = communityScope !== 'everyone'
  const pageTitle = hasSpecificCommunity ? `${communityScope} Benchmark` : 'Community Insights'

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <AppHeader right={<UserMenu />} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors mb-6"
        >
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">{pageTitle}</h1>
        <p className="text-[var(--ink-soft)] mb-4">
          See how many people are taking {DOMAIN_LABELS[domain]}, how they score, and where you stand.
        </p>

        {/* Domain + Designation share a row so the chart doesn't get pushed below the fold */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label htmlFor="stats-domain" className="block text-sm font-medium text-[var(--ink)] mb-1">
              Domain
            </label>
            <select
              id="stats-domain"
              aria-label="Domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as Domain)}
              className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)]"
            >
              {ALL_DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label htmlFor="stats-designation" className="block text-sm font-medium text-[var(--ink)] mb-1">
              Designation
            </label>
            <select
              id="stats-designation"
              aria-label="Designation"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)]"
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
            <label htmlFor="stats-experience" className="block text-sm font-medium text-[var(--ink)] mb-1">
              Experience
            </label>
            <select
              id="stats-experience"
              aria-label="Experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)]"
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
                ? 'border-[var(--action)] bg-[var(--paper)] text-[var(--action)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:border-[var(--action)] hover:text-[var(--action)]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {!showMoreFilters && activeFilterCount > 0 && (
              <span
                data-testid="filter-count-badge"
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--action)] text-white text-[10px] font-bold flex items-center justify-center"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showMoreFilters && (
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-[var(--surface)] rounded-lg border border-[var(--line)] p-4"
            data-testid="more-filters"
          >
            <div>
              <label htmlFor="stats-country" className="block text-sm font-medium text-[var(--ink)] mb-1">
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
                className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)]"
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
              <label htmlFor="stats-state" className="block text-sm font-medium text-[var(--ink)] mb-1">
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
                className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
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
              <label htmlFor="stats-city" className="block text-sm font-medium text-[var(--ink)] mb-1">
                City
              </label>
              <select
                id="stats-city"
                aria-label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!stateCode}
                className="w-full border border-[var(--line)] rounded-lg pl-3 pr-8 py-2 text-sm bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Tabs — scrolls horizontally on narrow screens instead of overflowing
            the page, since the three labels don't fit ~340px-and-under widths.
            The right-edge mask fades the last tab into transparency instead of
            clipping it mid-word, so it reads as "swipe for more" rather than
            broken text. */}
        <div
          className="overflow-x-auto mb-4"
          style={{
            maskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 20px), transparent)',
          }}
        >
          <div role="tablist" className="flex gap-1 border-b border-[var(--line)] w-max min-w-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap flex-shrink-0 ${
                  tab === t.id
                    ? 'border-[var(--action)] text-[var(--action)]'
                    : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Community Insights */}
        {tab === 'performance' && (
          <CommunityInsights
            domain={domain}
            loading={loading}
            error={error}
            stats={data}
            personal={personalData}
            communityScope={communityScope}
            hasSpecificCommunity={hasSpecificCommunity}
          />
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
            <p className="text-sm text-[var(--ink-soft)] mb-4">Top scorers in {DOMAIN_LABELS[domain]}</p>
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--line)] shadow-sm p-4">
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
