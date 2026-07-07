'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Country, State, City } from 'country-state-city'
import UserMenu from '@/components/UserMenu'
import DomainOverview from '@/components/DomainOverview'
import Leaderboard from '@/components/Leaderboard'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS } from '@/lib/domains'
import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'

// Below this many test-takers, a histogram is too sparse to be meaningful (and risks
// exposing an individual's score), so we show a message instead of a chart.
const MIN_SAMPLE_SIZE = 5

const TABS = [
  { id: 'performance', label: 'Community Insights' },
  { id: 'overview', label: 'Domain Overview' },
  { id: 'leaderboard', label: 'Leaderboard' },
] as const

// A single-hue ramp (not a rainbow) so the role donut reads as "one accent, several
// weights" rather than a chart-library default. Darkest = biggest segment.
const CHART_COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']


type Tab = (typeof TABS)[number]['id']

interface DistributionItem {
  label: string
  count: number
  percent: number
}

interface AverageScoreItem {
  label: string
  count: number
  averageScore: number
}

interface StatsResponse {
  histogram: number[]
  totalUsers: number
  yourScore: number | null
  yourRank: number | null
  percentile: number | null
  averageScore: number | null
  medianScore: number | null
  modeScore: number | null
  topScore: number | null
  lowScore: number | null
  averageTimeSeconds: number | null
  topScoreCount: number
  topScorePercent: number
  roleDistribution: DistributionItem[]
  roleAverageScores: AverageScoreItem[]
  experienceAverageScores: AverageScoreItem[]
  experienceDistribution: DistributionItem[]
  locationDistribution: DistributionItem[]
  locationAverageScores: AverageScoreItem[]
  locationDistributionLabel: string | null
  locationComparisons: LocationComparisonItem[]
  userProgress: UserProgress
}

interface LocationComparisonItem {
  label: string
  scope: string
  averageScore: number | null
  count: number
}

interface UserProgress {
  attemptCount: number
  latestScore: number | null
  previousScore: number | null
  scoreChange: number | null
  bestScore: number | null
  latestTimeSeconds: number | null
  averageTimePerQuestionSeconds: number | null
  scorePerMinute: number | null
  latestCompletedAt: string | null
  consistency: {
    label: string
    averageScore: number | null
    scoreRange: number | null
    standardDeviation: number | null
  }
}

interface OverviewResponse {
  averageScoreByDomain: Partial<Record<Domain, number | null>>
  attemptCounts: Partial<Record<Domain, number>>
  mostAttemptedDomain: Domain | null
  userLatestScoreByDomain: Partial<Record<Domain, number | null>>
  userBestScoreByDomain: Partial<Record<Domain, number | null>>
  userAttemptCountsByDomain: Partial<Record<Domain, number>>
}

function formatPeople(count: number) {
  return `${count} persons`
}

function formatScore(score: number | null) {
  return score === null ? '-' : `${score}/10`
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10
}

function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) return '-'
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function formatChange(change: number | null) {
  if (change === null) return '-'
  if (change > 0) return `+${change}`
  return String(change)
}

function getChangeClass(change: number | null) {
  if (change === null || change === 0) return 'text-gray-500'
  return change > 0 ? 'text-green-600' : 'text-red-600'
}

function getGapClass(value: number | null) {
  if (value === null || value === 0) return 'text-gray-500'
  return value > 0 ? 'text-green-600' : 'text-red-600'
}

function getConsistencyClass(label: string) {
  if (label === 'Stable') return 'text-green-600'
  if (label === 'Mixed') return 'text-yellow-600'
  if (label === 'Volatile') return 'text-red-600'
  return 'text-gray-950'
}

function getLocationDistributionTitle(
  label: string | null,
  countryName: string,
  stateName: string
) {
  if (label === 'Countries') return 'Countries taking this test'
  if (label === 'States / Regions') {
    return countryName ? `States / regions in ${countryName}` : 'States / regions taking this test'
  }
  if (label === 'Cities') {
    if (stateName) return `Cities in ${stateName}`
    if (countryName) return `Cities in ${countryName}`
    return 'Cities taking this test'
  }
  return label
}

function nameToCountryCode(name: string): string {
  if (!name) return ''
  return Country.getAllCountries().find((country) => country.name === name)?.isoCode ?? ''
}

function nameToStateCode(name: string, countryCode: string): string {
  if (!name || !countryCode) return ''
  return State.getStatesOfCountry(countryCode).find((state) => state.name === name)?.isoCode ?? ''
}

function DistributionPanel({
  title,
  items,
  testId,
}: {
  title: string
  items: DistributionItem[]
  testId: string
}) {
  const displayItems = items.slice(0, 6)
  const total = displayItems.reduce((sum, item) => sum + item.count, 0)
  const segments = displayItems.reduce<
    Array<DistributionItem & { color: string; segment: number; offset: number }>
  >((acc, item, index) => {
    const segment = total > 0 ? (item.count / total) * 100 : 0
    const offset = acc.reduce((sum, previous) => sum + previous.segment, 0)
    return [
      ...acc,
      {
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length],
        segment,
        offset,
      },
    ]
  }, [])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {items.length > 0 && (
          <span className="text-xs font-bold text-gray-500">{formatPeople(total)}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)] gap-5 items-center">
          <div className="relative w-36 h-36">
            <svg
              viewBox="0 0 40 40"
              className="-rotate-90 w-36 h-36 drop-shadow-sm"
              role="img"
              aria-label={`${title} chart`}
              data-testid={`${testId}-donut`}
            >
              <circle cx="20" cy="20" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              {segments.map((item) => (
                <circle
                  key={item.label}
                  cx="20"
                  cy="20"
                  r="15.915"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="6"
                  strokeDasharray={`${item.segment} ${100 - item.segment}`}
                  strokeDashoffset={-item.offset}
                  pathLength="100"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-3xl font-bold text-gray-950">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">people</span>
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            {segments.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-gray-800 truncate" title={item.label}>
                      {item.label}
                    </span>
                  </span>
                  <span className="font-mono text-xs font-medium text-gray-500 flex-shrink-0">
                    {item.count} · {item.percent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// One plain row of the crowd's key numbers — no card-within-a-card, no dark panel,
// just labeled figures in the app's existing white/gray/blue palette. "Your score"
// carries the rank + percentile as its detail line, so nothing from the old hero
// is lost, it's just one tile among the rest instead of a separate block.
// Plain label + number, nothing else — no justifying caption underneath. The
// numbers are self-explanatory from their labels alone.
function ScoreSnapshot({ data }: { data: StatsResponse }) {
  const stats = [
    { label: 'Test-takers', value: String(data.totalUsers) },
    { label: 'Your score', value: data.yourScore === null ? '-' : `${data.yourScore}/10` },
    { label: 'Average', value: formatScore(data.averageScore) },
    { label: 'Median', value: formatScore(data.medianScore) },
    { label: 'Most common', value: formatScore(data.modeScore) },
    { label: 'Lowest', value: formatScore(data.lowScore) },
    { label: 'Top score', value: formatScore(data.topScore) },
  ]

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-5 sm:divide-x sm:divide-gray-100 w-full"
      data-testid="score-snapshot"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="sm:px-4 sm:first:pl-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{stat.label}</p>
          <p className="font-mono text-xl font-bold text-gray-950 mt-1">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

function PlaceInsightsPanel({
  data,
  overview,
  scopeLabel,
  profileDesignation,
  profileExperience,
}: {
  data: StatsResponse
  overview: OverviewResponse | null
  scopeLabel: string
  profileDesignation: string
  profileExperience: string
}) {
  const yourScore = data.yourScore
  const averageGap =
    yourScore !== null && data.averageScore !== null ? roundToOne(yourScore - data.averageScore) : null
  const topGap =
    yourScore !== null && data.topScore !== null ? roundToOne(data.topScore - yourScore) : null
  const roleAverage = data.roleAverageScores.find((item) => item.label === profileDesignation)
  const experienceAverage = data.experienceAverageScores.find((item) => item.label === profileExperience)

  const strongestDomain = overview
    ? ALL_DOMAINS
        .map((domainId) => ({
          id: domainId,
          label: DOMAIN_LABELS[domainId],
          score: overview.userLatestScoreByDomain[domainId] ?? null,
        }))
        .filter((item): item is { id: Domain; label: string; score: number } => item.score !== null)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))[0] ?? null
    : null

  const hardestDomain = overview
    ? ALL_DOMAINS
        .map((domainId) => ({
          id: domainId,
          label: DOMAIN_LABELS[domainId],
          averageScore: overview.averageScoreByDomain[domainId] ?? null,
          count: overview.attemptCounts[domainId] ?? 0,
        }))
        .filter(
          (item): item is { id: Domain; label: string; averageScore: number; count: number } =>
            item.averageScore !== null && item.count > 0
        )
        .sort((a, b) => a.averageScore - b.averageScore || b.count - a.count)[0] ?? null
    : null

  const rankValue =
    data.yourRank !== null ? `#${data.yourRank} of ${data.totalUsers}` : data.yourScore === null ? '-' : 'Outside filter'
  const percentileValue = data.percentile !== null ? `${data.percentile}%` : '-'
  const topScoreDetail =
    topGap === null ? 'No score yet' : topGap === 0 ? 'You share the top score' : `${topGap} pts to reach top`
  const averageComparisonSentence = (() => {
    if (averageGap === null) return 'Not enough data yet'
    const rounded = Math.round(averageGap * 10) / 10
    if (rounded === 0) return `You match the ${scopeLabel} average`
    const comparisonText = `${Math.abs(rounded)} points ${rounded > 0 ? 'higher' : 'lower'}`

    return (
      <>
        You are <span className={getGapClass(averageGap)}>{comparisonText}</span> than the {scopeLabel} average
      </>
    )
  })()

  const items: Array<{
    label: string
    value: ReactNode
    detail: string
    valueClass: string
    sentenceValue?: boolean
    detailClass?: string
    testId: string
  }> = [
    {
      label: `Rank in ${scopeLabel}`,
      value: rankValue,
      detail: 'among matching test-takers',
      valueClass: 'text-blue-700',
      testId: 'place-rank',
    },
    {
      label: 'Scored above',
      value: percentileValue,
      detail: `of ${scopeLabel}`,
      valueClass: 'text-blue-700',
      testId: 'place-percentile',
    },
    {
      label: 'Compared with average',
      value: averageComparisonSentence,
      detail: `Average score ${formatScore(data.averageScore)}`,
      valueClass: 'text-gray-700',
      sentenceValue: true,
      testId: 'place-average-gap',
    },
    {
      label: 'Top score here',
      value: formatScore(data.topScore),
      detail: topScoreDetail,
      valueClass: 'text-blue-700',
      testId: 'place-top-gap',
    },
    {
      label: 'Role group average',
      value: roleAverage ? formatScore(roleAverage.averageScore) : '-',
      detail: profileDesignation || 'Complete profile',
      valueClass: 'text-blue-700',
      testId: 'place-role-gap',
    },
    {
      label: 'Experience group average',
      value: experienceAverage ? formatScore(experienceAverage.averageScore) : '-',
      detail: profileExperience || 'Complete profile',
      valueClass: 'text-blue-700',
      testId: 'place-experience-gap',
    },
    {
      label: 'Your best domain',
      value: strongestDomain ? formatScore(strongestDomain.score) : '-',
      detail: strongestDomain?.label ?? 'Take more domains',
      valueClass: 'text-blue-700',
      testId: 'place-strongest-domain',
    },
    {
      label: 'Toughest domain here',
      value: hardestDomain ? formatScore(hardestDomain.averageScore) : '-',
      detail: hardestDomain?.label ?? 'No local domain data',
      valueClass: 'text-blue-700',
      testId: 'place-hardest-domain',
    },
  ]

  return (
    <div className="space-y-3" data-testid="place-insights">
      <div>
        <h3 className="text-base font-bold text-gray-900">Your standing in {scopeLabel}</h3>
        <p className="text-xs text-gray-500 mt-1">How your score compares with nearby and similar test-takers</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-4" data-testid={item.testId}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
            <p
              className={`mt-1 font-bold leading-tight ${
                item.sentenceValue ? `text-sm ${item.valueClass}` : `font-mono text-xl ${item.valueClass}`
              }`}
            >
              {item.value}
            </p>
            <p
              className={`mt-1 truncate text-xs ${item.detailClass ?? 'text-gray-500'}`}
              title={item.detail}
            >
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// A single fading-blue "leaderboard" list — a deliberately different shape from the
// donut so role, city and experience data don't all look like the same chart.
function RankedBarList({
  title,
  items,
  testId,
}: {
  title: string
  items: DistributionItem[]
  testId: string
}) {
  const displayItems = items.slice(0, 6)
  const total = displayItems.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 h-full" data-testid={testId}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {items.length > 0 && <span className="font-mono text-xs font-medium text-gray-400">{total}</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <ol className="space-y-3">
          {displayItems.map((item, index) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="w-4 flex-shrink-0 font-mono text-xs text-gray-300">{index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-gray-800 truncate">{item.label}</span>
                  <span className="font-mono text-xs font-medium text-gray-500 flex-shrink-0">
                    {item.count} · {item.percent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${item.percent}%`, opacity: Math.max(1 - index * 0.15, 0.35) }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// Bars scaled to the 0-10 score axis (not to each other's share of the crowd) so a
// designation's bar length directly reads as "how well this group scores" —
// a horizontal bar chart is the natural fit for comparing one number across categories.
function AverageScoreChart({
  title,
  subtitle,
  items,
  testId,
}: {
  title: string
  subtitle: string
  items: AverageScoreItem[]
  testId: string
}) {
  const orderedItems =
    testId === 'experience-score-chart'
      ? [...items].sort(
          (a, b) =>
            EXPERIENCE_OPTIONS.indexOf(a.label) - EXPERIENCE_OPTIONS.indexOf(b.label)
        )
      : items
  const displayItems = orderedItems
  const rowGridClass =
    testId === 'experience-score-chart'
      ? 'grid-cols-[minmax(0,5.75rem)_4.75rem_minmax(0,1fr)_3rem]'
      : 'grid-cols-[minmax(0,13rem)_4.75rem_minmax(0,1fr)_3rem]'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5" data-testid={testId}>
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <h3 className="text-sm font-bold text-gray-900 leading-snug">{title}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{subtitle}</p>
        </div>
        <span className="font-mono text-[10px] font-semibold text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
          out of 10
        </span>
      </div>
      {displayItems.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayItems.map((item) => (
            <div key={item.label} className="py-1 first:pt-0 last:pb-0">
              <div className={`grid ${rowGridClass} items-baseline gap-2 mb-0.5`}>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-800 leading-tight break-words">
                    {item.label}
                  </p>
                </div>
                <span className="text-left text-[10px] font-medium text-gray-400 whitespace-nowrap">
                  {formatPeople(item.count)}
                </span>
                <span aria-hidden="true" />
                <p className="text-right font-mono text-sm font-bold text-blue-700 leading-none">
                  {item.averageScore}/10
                </p>
              </div>
              <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${(item.averageScore / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LocationComparisonChart({ items }: { items: LocationComparisonItem[] }) {
  const displayItems = items.filter((item) => item.count > 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 w-full" data-testid="local-global-comparison">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Local vs global</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Average score for this domain by scope</p>
        </div>
        <span className="font-mono text-[10px] font-semibold text-gray-400 bg-gray-50 rounded-full px-2 py-0.5 whitespace-nowrap">
          latest attempts
        </span>
      </div>
      {displayItems.length === 0 ? (
        <p className="text-sm text-gray-500">No comparison data yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {displayItems.map((item) => (
            <div key={`${item.scope}-${item.label}`} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{item.label}</p>
                  <p className="grid grid-cols-[6.75rem_auto] gap-2 text-[11px] text-gray-400">
                    <span>{item.scope}</span>
                    <span className="whitespace-nowrap">{formatPeople(item.count)}</span>
                  </p>
                </div>
                <span className="font-mono text-sm font-bold text-blue-700 flex-shrink-0">
                  {formatScore(item.averageScore)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${((item.averageScore ?? 0) / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgressPanel({ data }: { data: StatsResponse }) {
  const progress = data.userProgress
  const hasAttempt = progress.latestScore !== null
  const changeClass = getChangeClass(progress.scoreChange)
  const consistencyClass = getConsistencyClass(progress.consistency.label)
  const consistencyDetail =
    progress.consistency.standardDeviation === null
      ? 'Take one more attempt to measure consistency'
      : `Your scores vary by ${progress.consistency.scoreRange} points across attempts.`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="progress-panels">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Progress over time</p>
        <p className="font-mono text-2xl font-bold text-gray-950 mt-2">
          {hasAttempt ? formatScore(progress.latestScore) : '-'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Previous <span className="font-mono font-bold text-blue-700">{formatScore(progress.previousScore)}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Change <span className={`font-mono text-sm font-bold ${changeClass}`}>{formatChange(progress.scoreChange)}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Average <span className="font-mono font-bold text-blue-700">{formatScore(progress.consistency.averageScore)}</span>
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Best vs latest</p>
        <p className="font-mono text-2xl font-bold text-gray-950 mt-2">
          {formatScore(progress.bestScore)}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Latest <span className="font-mono text-sm font-bold text-blue-700">{formatScore(progress.latestScore)}</span>
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Time efficiency</p>
        <p className="font-mono text-2xl font-bold text-gray-950 mt-2">
          {formatDuration(progress.latestTimeSeconds)}
        </p>
        {!hasAttempt && <p className="text-xs text-gray-600 mt-2">No attempt yet</p>}
        <p className="text-xs text-gray-500 mt-1">
          Community avg <span className="font-mono font-bold text-blue-700">{formatDuration(data.averageTimeSeconds)}</span>
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Consistency</p>
        <p className={`font-mono text-2xl font-bold mt-2 ${consistencyClass}`}>
          {progress.consistency.label}
        </p>
        <p className="text-xs text-gray-500 mt-2">{consistencyDetail}</p>
      </div>
    </div>
  )
}

function DomainStrengthRanking({ overview }: { overview: OverviewResponse | null }) {
  if (!overview) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5 w-full" data-testid="domain-strength-ranking">
        <p className="text-gray-400 text-sm animate-pulse">Loading domain strengths...</p>
      </div>
    )
  }

  const rankedDomains = ALL_DOMAINS
    .map((domainId) => ({
      id: domainId,
      label: DOMAIN_LABELS[domainId],
      score: overview.userLatestScoreByDomain[domainId] ?? null,
      best: overview.userBestScoreByDomain[domainId] ?? null,
      attempts: overview.userAttemptCountsByDomain[domainId] ?? 0,
    }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.label.localeCompare(b.label)
      if (a.score === null) return 1
      if (b.score === null) return -1
      return b.score - a.score || a.label.localeCompare(b.label)
    })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 w-full" data-testid="domain-strength-ranking">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Domain strength ranking</h3>
          <p className="text-xs text-gray-500 mt-1">Your latest score, best to weakest</p>
        </div>
      </div>
      <div className="space-y-3">
        {rankedDomains.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-xs text-gray-300 w-4">{index + 1}</span>
                <span className="text-xs font-bold text-gray-800 leading-snug break-words">{item.label}</span>
              </span>
              {item.score === null ? (
                <span className="w-44 text-right text-[11px] font-medium text-gray-400 flex-shrink-0">
                  Not attempted
                </span>
              ) : (
                <span className="grid w-44 grid-cols-2 gap-3 text-[11px] font-medium text-gray-400 flex-shrink-0">
                  <span>
                    Latest <span className="font-mono font-bold text-blue-700">{formatScore(item.score)}</span>
                  </span>
                  <span>
                    Best <span className="font-mono font-bold text-blue-700">{formatScore(item.best ?? item.score)}</span>
                  </span>
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${((item.score ?? 0) / 10) * 100}%`, opacity: item.score === null ? 0.2 : 1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Quiet uppercase label that splits the page into readable chapters without
// adding another boxed card.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 pt-4 mt-1 border-t border-gray-100">{children}</h2>
  )
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
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileLocationReady, setProfileLocationReady] = useState(false)
  const [profileDesignation, setProfileDesignation] = useState('')
  const [profileExperience, setProfileExperience] = useState('')

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

        if (!cancelled) {
          setProfileDesignation(profile?.designation ?? '')
          setProfileExperience(profile?.years_of_experience ?? '')
        }

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
  }, [domain, designation, experience, countryName, stateName, city, profileLocationReady])

  useEffect(() => {
    let cancelled = false

    async function fetchOverview() {
      if (!profileLocationReady) return
      try {
        const params = new URLSearchParams({
          designation,
          experience,
          country: countryName || 'all',
          state_region: stateName || 'all',
          city: city || 'all',
        })
        const res = await fetch(`/api/stats/overview?${params}`)
        if (!res.ok) throw new Error('Failed to load overview')
        const json = await res.json()
        if (!cancelled) setOverviewData(json)
      } catch {
        if (!cancelled) setOverviewData(null)
      }
    }

    fetchOverview()
    return () => {
      cancelled = true
    }
  }, [designation, experience, countryName, stateName, city, profileLocationReady])

  const maxPercent =
    data && data.totalUsers > 0 ? Math.max(...data.histogram.map((c) => (c / data.totalUsers) * 100)) : 0

  // Round the axis ceiling up to a clean multiple of 10 (min 20) so gridlines land on tidy numbers
  const yAxisMax = Math.max(20, Math.ceil(maxPercent / 10) * 10)
  const yAxisTicks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(yAxisMax * f))

  const activeFilterCount = [countryCode, stateCode, city].filter((v) => v !== '').length
  const communityScope = city || stateName || countryName || 'everyone'
  const hasSpecificCommunity = communityScope !== 'everyone'
  const pageTitle = hasSpecificCommunity ? `${communityScope} Benchmark` : 'Community Insights'
  // The page heading already states the scope (e.g. "Hyderabad Benchmark"), so these
  // card titles stay plain instead of repeating "in Hyderabad" on every card.
  const roleDistributionTitle = 'Roles'
  const experienceDistributionTitle = 'Experience'
  const locationDistributionTitle = getLocationDistributionTitle(
    data?.locationDistributionLabel ?? null,
    countryName,
    stateName
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Domain Knowledge Test</span>
        <UserMenu />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition mb-6"
        >
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">{pageTitle}</h1>
        <p className="text-gray-500 mb-4">
          See how many people are taking {DOMAIN_LABELS[domain]}, how they score, and where you stand.
        </p>

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
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-white rounded-lg border border-gray-200 p-4"
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

        {/* Community Insights */}
        {tab === 'performance' && (
          <div className="space-y-4">
            {!loading && !error && data && data.totalUsers === 0 && (
              <p className="text-gray-500 text-sm" data-testid="no-attempts-yet">
                Nobody in {hasSpecificCommunity ? communityScope : 'this group'} has taken the{' '}
                {DOMAIN_LABELS[domain]} test yet — be the first!
              </p>
            )}

            {!loading && !error && data && (
              <SectionLabel>Your benchmark</SectionLabel>
            )}
            {!loading && !error && data && (
              <ProgressPanel data={data} />
            )}
            {!loading && !error && data && (
              <DomainStrengthRanking overview={overviewData} />
            )}

            {/* The crowd's key numbers in one quiet strip */}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <ScoreSnapshot data={data} />
            )}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <PlaceInsightsPanel
                data={data}
                overview={overviewData}
                scopeLabel={communityScope}
                profileDesignation={profileDesignation}
                profileExperience={profileExperience}
              />
            )}

            {/* Who makes up this crowd, at a glance — roles, cities, experience.
                flex-wrap (not a fixed 3-col grid) so 2 panels fill the row evenly
                instead of leaving a dead empty column when there's no city to show. */}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <>
                <LocationComparisonChart items={data.locationComparisons} />
                <SectionLabel>Who&apos;s taking it</SectionLabel>
              </>
            )}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <DistributionPanel
                    title={roleDistributionTitle}
                    items={data.roleDistribution}
                    testId="role-distribution"
                  />
                </div>
                {data.locationDistributionLabel && data.locationDistribution.length > 0 && (
                  <div className="flex-1 min-w-[280px]">
                    <RankedBarList
                      title={locationDistributionTitle ?? data.locationDistributionLabel}
                      items={data.locationDistribution}
                      testId="location-distribution"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-[280px]">
                  <RankedBarList
                    title={experienceDistributionTitle}
                    items={data.experienceDistribution}
                    testId="experience-distribution"
                  />
                </div>
              </div>
            )}

            {/* Chart */}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <SectionLabel>How they score</SectionLabel>
            )}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
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
                  <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Score distribution</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        How everyone here scored — the blue bar is you
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {data.averageScore !== null && (
                        <span
                          className="flex h-16 w-36 flex-col justify-center rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                          data-testid="chart-average"
                        >
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Average
                          </span>
                          <span className="block font-mono text-sm font-bold text-blue-700 leading-tight">
                            {data.averageScore}/10
                          </span>
                        </span>
                      )}
                      {data.topScore !== null && (
                        <span
                          className="flex h-16 w-36 flex-col justify-center rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                          data-testid="chart-top-score"
                        >
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                            Top score
                          </span>
                          <span className="block font-mono text-sm font-bold text-blue-700 leading-tight">
                            {data.topScore}/10
                          </span>
                          <span className="block text-[10px] font-medium text-gray-400 leading-tight">
                            {formatPeople(data.topScoreCount)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1rem_2rem_minmax(0,1fr)] gap-x-3">
                    {/* Y-axis label + percentage scale */}
                    <div className="relative h-56 w-4">
                      <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-xs text-gray-400">
                        Test-takers (%)
                      </p>
                    </div>
                    <div className="flex flex-col justify-between h-56 font-mono text-[11px] text-gray-400 text-right">
                      {yAxisTicks.map((tick) => (
                        <span key={tick}>{tick}%</span>
                      ))}
                    </div>

                    {/* Bars + gridlines */}
                    <div className="flex-1 relative h-56">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {yAxisTicks.map((tick) => (
                          <div key={tick} className="border-t border-gray-100 w-full" />
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
                              {count > 0 && (
                                <span className="font-mono text-[10px] font-semibold text-gray-500 mb-1">
                                  {count}
                                </span>
                              )}
                              <div
                                className={`w-full rounded-t-sm transition-all duration-500 ease-out ${isYou ? 'bg-blue-600' : 'bg-blue-100'}`}
                                style={{
                                  height: `${heightPercent}%`,
                                  minHeight: count > 0 ? '4px' : '0',
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* X-axis: score labels, aligned under the bars */}
                  <div className="grid grid-cols-[1rem_2rem_minmax(0,1fr)] gap-x-3 mt-2">
                    <div className="col-span-2" />
                    <div className="flex gap-2">
                      {data.histogram.map((_, score) => (
                        <span key={score} className="flex-1 text-center font-mono text-[11px] text-gray-400">
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-2">Score (out of 10)</p>
                </div>
              )}
            </div>

            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <SectionLabel>Average score by group</SectionLabel>
            )}
            {!loading && !error && data && data.totalUsers >= MIN_SAMPLE_SIZE && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <AverageScoreChart
                  title="Average score by designation"
                  subtitle="Who's scoring highest, role by role"
                  items={data.roleAverageScores}
                  testId="designation-score-chart"
                />
                <AverageScoreChart
                  title="Average score by experience"
                  subtitle="How experience bands compare"
                  items={data.experienceAverageScores}
                  testId="experience-score-chart"
                />
                <AverageScoreChart
                  title="Average score by location"
                  subtitle={locationDistributionTitle ?? 'How places compare'}
                  items={data.locationAverageScores}
                  testId="location-score-chart"
                />
              </div>
            )}
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
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
