'use client'

import type { ReactNode } from 'react'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_LABELS_SHORT } from '@/lib/domains'
import { roundToOne } from '@/lib/stats-calculations'
import type { PersonalStatsResponse, StatsResponse } from '@/lib/stats-types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'

function domainLabel(domain: string) {
  return DOMAIN_LABELS_SHORT[domain as Domain] ?? domain
}

// Even DOMAIN_LABELS_SHORT ("Cloud Computing", "Data Science & Analytics") is
// too long for a radar chart's axis labels at this tile size — a dedicated,
// shorter set keeps every label on one line without clipping.
const RADAR_LABELS: Record<Domain, string> = {
  ai: 'AI',
  cloud: 'Cloud',
  cybersecurity: 'Cyber',
  devops: 'DevOps',
  data_science: 'Data',
}

function radarLabel(domain: string) {
  return RADAR_LABELS[domain as Domain] ?? domain
}



function formatChange(change: number | null) {
  if (change === null) return '—'
  if (change > 0) return `+${change}`
  return String(change)
}

function changeClass(change: number | null) {
  if (change === null || change === 0) return 'text-[var(--ink-soft)]'
  return change > 0 ? 'text-green-600' : 'text-red-600'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

// 11-13 are the "teens" exception (11th, 12th, 13th) even though they end in
// 1/2/3 — everything else keys off the last digit (1st, 2nd, 3rd, else th).
function ordinalSuffix(n: number) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (n % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

function Tile({
  title,
  note,
  testId,
  className = '',
  children,
}: {
  title?: string
  note?: string
  testId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      // w-full/h-full matter here: Tile's parent is a flex wrapper (for the
      // md:col-span-N grid pattern), and a flex container's main axis (width)
      // does not auto-stretch children the way the cross axis (height) does.
      // Without an explicit w-full, a tile shrinks to its own content width
      // and leaves the rest of its grid column as blank space.
      className={`relative min-w-0 w-full h-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-lg transition-all duration-500 flex flex-col group ${className}`}
      data-testid={testId}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {title && <h3 className="mb-1 text-[15px] font-bold leading-tight text-[var(--ink)] tracking-tight">{title}</h3>}
      {note && <p className="mb-4 text-[12px] leading-relaxed text-[var(--ink-soft)]/90">{note}</p>}
      <div className="min-w-0 flex-1 flex flex-col relative z-10">{children}</div>
    </div>
  )
}

function ChartGradients() {
  return (
    <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[11.5px] text-[var(--ink-soft)]">{text}</p>
}

// ===== Hero row =====

function HeroRow({ stats }: { stats: StatsResponse; personal: PersonalStatsResponse }) {
  const testsTaken = stats.userProgress.attemptCount
  const averageScore = stats.userProgress.consistency.averageScore
  const bestScore = stats.userProgress.bestScore
  const scoreChange = stats.userProgress.scoreChange

  return (
    // Flex-wrap (not a fixed-column grid) so five cards never leave a ragged,
    // half-empty trailing row — whatever doesn't fit on a line grows to fill
    // it evenly, at every viewport width.
    <div
      className="flex flex-wrap gap-4 mb-8"
      data-testid="hero-row"
    >
      <Tile className="min-w-[140px] flex-1 group">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Tests taken</p>
        <p className="mt-3 font-mono text-4xl font-extrabold text-indigo-600 tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 origin-left">{testsTaken}</p>
      </Tile>
      <Tile className="min-w-[140px] flex-1 group">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Average score</p>
        <p className="mt-3 font-mono text-4xl font-extrabold text-indigo-600 tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 origin-left">{averageScore ?? '—'}</p>
      </Tile>
      <Tile className="min-w-[140px] flex-1 group">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Best score</p>
        <p className="mt-3 font-mono text-4xl font-extrabold text-indigo-600 tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 origin-left">
          {bestScore ?? '—'}
          {bestScore !== null && <span className="text-lg font-bold text-indigo-400 ml-1">/10</span>}
        </p>
      </Tile>
      <Tile className="min-w-[140px] flex-1 group">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Percentile</p>
        <p className="mt-3 font-mono text-4xl font-extrabold text-indigo-600 tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 origin-left">
          {stats.percentile !== null ? (
            <>
              {stats.percentile}
              <span className="text-xl font-bold text-indigo-400 ml-1">%</span>
            </>
          ) : (
            '—'
          )}
        </p>
      </Tile>
      <Tile testId="score-change-tile" className="min-w-[140px] flex-1 group">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-500">Score change</p>
        {scoreChange === null ? (
          <p className="mt-3 font-mono text-4xl font-extrabold text-slate-400 tracking-tighter drop-shadow-sm">—</p>
        ) : (
          <p className={`mt-3 font-mono text-4xl font-extrabold tracking-tighter drop-shadow-sm group-hover:scale-105 transition-transform duration-300 origin-left ${scoreChange > 0 ? 'text-emerald-600' : scoreChange < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
            {scoreChange > 0 ? `+${scoreChange.toFixed(1)}` : scoreChange.toFixed(1)}
          </p>
        )}
      </Tile>
    </div>
  )
}

function ScoreTrendTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.pacePoints.slice(-12)
  if (points.length === 0) {
    return (
      <Tile title="Score trend" className="w-full">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  const data = points.map((p, i) => ({
    name: i,
    score: p.score,
  }))

  return (
    <Tile
      title="Score trend"
      note="Score out of 10 over your last 12 attempts"
      testId="score-trend"
      className="w-full"
    >
      <div className="mt-2 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
            <XAxis dataKey="name" hide />
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', fontSize: '13px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--ink)', fontWeight: 'bold' }}
              labelFormatter={(label) => `Attempt ${Number(label) + 1}`}
              formatter={(value) => [`${value ?? 0}/10`, 'Score']}
            />
            <Area type="monotone" dataKey="score" stroke="#4f46e5" fillOpacity={1} fill="url(#colorIndigo)" strokeWidth={3} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#4f46e5', style: { filter: 'drop-shadow(0 0 8px rgba(79,70,229,0.6))' } }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex justify-between text-[11px] font-medium text-[var(--ink-soft)] px-2">
        <span>Oldest</span>
        <span className="tracking-widest uppercase">Attempt Timeline →</span>
        <span>Newest</span>
      </div>
    </Tile>
  )
}

function ScoreDistributionTile({ stats }: { stats: StatsResponse }) {
  if (stats.totalUsers === 0) {
    return (
      <Tile title="How the crowd scored" note="Number of people at each score 0–10" className="w-full h-full">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const yourScore = stats.yourScore
  const data = stats.histogram.map((count, score) => ({
    score: score.toString(),
    count,
    isYou: yourScore === score
  }))

  return (
    <Tile
      title="How the crowd scored"
      note={
        yourScore !== null
          ? `Darker bar = your score (${yourScore}/10).`
          : 'Y = number of people · X = score (0–10)'
      }
      testId="score-distribution-tile"
      className="w-full h-full"
    >
      <div className="mt-4 h-[160px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
            <XAxis dataKey="score" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} allowDecimals={false} />
            <RechartsTooltip 
              cursor={{ fill: 'var(--paper)', opacity: 0.5 }}
              contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '12px', fontSize: '13px', padding: '8px 12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--ink)', fontWeight: 'bold' }}
              labelFormatter={(label) => `Score: ${label}/10`}
              formatter={(value) => [value ?? 0, 'People']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isYou ? '#4f46e5' : '#e0e7ff'} className="transition-all duration-300 hover:opacity-80" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tile>
  )
}

// Streak and time-invested are both single small "activity" facts, so they
// share one card rather than each getting a big, mostly-empty tile.
function YourActivityTile({ personal }: { personal: PersonalStatsResponse }) {
  const { currentStreak, longestStreak } = personal.streaks
  const flames = Array.from({ length: 7 }, (_, i) => i < Math.min(currentStreak, 7))
  const points = personal.pacePoints
  const totalSeconds = points.reduce((sum, p) => sum + p.timeTakenSeconds, 0)
  const averageSeconds = points.length > 0 ? Math.round(totalSeconds / points.length) : 0

  return (
    <Tile title="Your activity" note="Your streak and the time you've put in" testId="activity-tile">
      <div className="flex-1 grid grid-cols-2 gap-5">
        {/* Streak */}
        <div className="flex flex-col justify-center gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Current streak</p>
          <p className="font-mono text-4xl font-extrabold leading-none text-[var(--ink)]">
            {currentStreak}
            <span className="ml-1.5 text-xs font-normal text-[var(--ink-soft)]">
              {currentStreak === 1 ? 'day' : 'days'}
            </span>
          </p>
          <div className="flex gap-[3px]" aria-hidden="true">
            {flames.map((on, i) => (
              <div
                key={i}
                className={`h-3.5 flex-1 rounded-[2px] ${on ? 'bg-[var(--signal)]' : 'bg-[var(--paper)]'}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-[var(--ink-soft)]">
            Best <span className="font-mono font-semibold text-[var(--ink)]">{longestStreak}</span> days
          </p>
        </div>

        {/* Time invested */}
        <div className="flex flex-col justify-center gap-2.5 border-l border-[var(--line)] pl-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Time invested</p>
          {points.length === 0 ? (
            <EmptyNote text="No attempts yet." />
          ) : (
            <>
              <p className="font-mono text-3xl font-extrabold leading-none text-[var(--ink)]">
                {formatDuration(totalSeconds)}
              </p>
              <p className="text-[11px] text-[var(--ink-soft)]">
                Avg <span className="font-mono font-semibold text-[var(--ink)]">{formatDuration(averageSeconds)}</span> / try
              </p>
              <p className="text-[11px] text-[var(--ink-soft)]">
                <span className="font-mono font-semibold text-[var(--ink)]">{points.length}</span> attempts
              </p>
            </>
          )}
        </div>
      </div>
    </Tile>
  )
}

function DomainsCoveredTile({ personal }: { personal: PersonalStatsResponse }) {
  const attemptedIds = new Set(personal.domainRanges.map((d) => d.domain))
  const attempted = attemptedIds.size
  const total = ALL_DOMAINS.length
  const remaining = total > attempted ? total - attempted : 0

  const chartData = [
    { name: 'Attempted', value: attempted },
    { name: 'Remaining', value: remaining },
  ]

  return (
    <Tile title="Domains covered" testId="domains-covered-tile" className="w-full h-full">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="relative flex-shrink-0 mb-4" style={{ width: 150, height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={74}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                cornerRadius={10}
              >
                {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.name === 'Remaining' ? 'var(--line)' : '#4f46e5'} fillOpacity={entry.name === 'Remaining' ? 0.35 : 1} />
              ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center font-mono text-[32px] font-extrabold tabular-nums text-indigo-600 drop-shadow-sm">
            {attempted}
            <span className="text-[12px] font-semibold text-slate-400 -mt-2">out of {total}</span>
          </span>
        </div>
        <div className="w-full">
          <div className="flex flex-wrap justify-center gap-1.5">
            {ALL_DOMAINS.map((d) => {
              const on = attemptedIds.has(d)
              return (
                <span
                  key={d}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold tracking-wide uppercase transition-colors ${
                    on ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {radarLabel(d)}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </Tile>
  )
}

const TIME_OF_DAY_BUCKETS = [
  { label: 'Night', from: 0, to: 6 },
  { label: 'Morning', from: 6, to: 12 },
  { label: 'Afternoon', from: 12, to: 18 },
  { label: 'Evening', from: 18, to: 24 },
]
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function WhenYouTestBestTile({ personal }: { personal: PersonalStatsResponse }) {
  const grid = DAY_LABELS.map((_, dayOfWeek) =>
    TIME_OF_DAY_BUCKETS.map((bucket) => {
      const matches = personal.timeOfDayPerformance.filter(
        (t) => t.dayOfWeek === dayOfWeek && t.hour >= bucket.from && t.hour < bucket.to
      )
      if (matches.length === 0) return null
      const totalCount = matches.reduce((sum, m) => sum + m.count, 0)
      const weighted = matches.reduce((sum, m) => sum + m.averageScore * m.count, 0) / totalCount
      return roundToOne(weighted)
    })
  )
  const allScores = grid.flat().filter((v): v is number => v !== null)

  if (allScores.length === 0) {
    return (
      <Tile title="When you test best" note="Darker = higher average score at that day/time">
        <EmptyNote text="Not enough attempts yet." />
      </Tile>
    )
  }

  const min = Math.min(...allScores)
  const max = Math.max(...allScores)
  const colors = ['var(--paper)', '#c7d6fb', '#8aa4f2', 'var(--signal)', '#1d3fae']
  function colorFor(v: number | null) {
    if (v === null) return colors[0]
    if (max === min) return colors[2]
    const ratio = (v - min) / (max - min)
    return colors[Math.min(4, Math.max(1, Math.round(ratio * 4)))]
  }

  return (
    <Tile
      title="When you test best"
      note="Rows = day of week · columns = Night / Morning / Afternoon / Evening · darker = higher score"
      testId="time-of-day-tile"
    >
      <div className="mb-1 flex gap-[3px] pl-3">
        {TIME_OF_DAY_BUCKETS.map((bucket) => (
          <span key={bucket.label} className="flex-1 text-center text-[8px] text-[var(--ink-soft)]" title={bucket.label}>
            {bucket.label}
          </span>
        ))}
      </div>
      <div className="space-y-[3px]">
        {DAY_LABELS.map((day, dayOfWeek) => (
          <div key={dayOfWeek} className="flex items-center gap-[3px]">
            <span className="w-3 text-[8px] text-[var(--ink-soft)]">{day}</span>
            {TIME_OF_DAY_BUCKETS.map((bucket, bucketIndex) => (
              <div
                key={bucket.label}
                className="h-3.5 flex-1 rounded-sm"
                style={{ background: colorFor(grid[dayOfWeek][bucketIndex]) }}
                title={`${day} ${bucket.label}: ${grid[dayOfWeek][bucketIndex] ?? 'no data'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </Tile>
  )
}

function PaceVsAccuracyTile({ personal }: { personal: PersonalStatsResponse }) {
  // Most recent first — row list is easier to read than a scatter when n is small.
  const points = personal.pacePoints.slice(-8).reverse()
  if (points.length === 0) {
    return (
      <Tile title="Pace vs. accuracy" note="Did you score higher when you went faster or slower?" className="w-full h-full">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  // Quiz timer is 5 minutes, so every bar is on the same absolute scale.
  const MAX_SECONDS = 300
  const avgTime = Math.round(points.reduce((s, p) => s + p.timeTakenSeconds, 0) / points.length)
  const avgScore = roundToOne(points.reduce((s, p) => s + p.score, 0) / points.length)

  return (
    <Tile
      title="Pace vs. accuracy"
      note="Bar length = time used. Color = score."
      testId="pace-vs-accuracy-tile"
      className="w-full h-full"
    >
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[var(--ink-soft)] bg-white/40 p-3.5 rounded-xl border border-[var(--line)]/50">
        <span className="flex flex-col">
          <span className="text-[9.5px] uppercase tracking-wider font-bold opacity-70">Avg time</span>
          <b className="font-mono text-[16px] text-indigo-600">{formatDuration(avgTime)}</b>
        </span>
        <span className="w-px h-auto bg-[var(--line)]" />
        <span className="flex flex-col">
          <span className="text-[9.5px] uppercase tracking-wider font-bold opacity-70">Avg score</span>
          <b className="font-mono text-[16px] text-indigo-600">{avgScore}/10</b>
        </span>
      </div>

      <div className="mb-3 grid grid-cols-[2.5rem_1fr_3.5rem] gap-4 text-[9.5px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
        <span className="text-right">Score</span>
        <span>Time used (0 → 5m)</span>
        <span className="text-right">Duration</span>
      </div>

      <div className="space-y-5 mt-auto mb-1 flex-1 flex flex-col justify-center">
        {points.map((p, i) => {
          const widthPct = Math.min(100, (p.timeTakenSeconds / MAX_SECONDS) * 100)
          const high = p.score >= 8
          const mid = p.score >= 5
          return (
            <div key={`${p.completedAt}-${i}`} className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-4">
              <span
                className={`text-right font-mono text-[14px] font-extrabold tabular-nums ${
                  high ? 'text-[#1d3fae]' : mid ? 'text-[#3d68e8]' : 'text-[#8aa4f2]'
                }`}
              >
                {p.score}
                <span className="text-[10px] font-medium opacity-50">/10</span>
              </span>
              <div className="relative h-4 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                <div
                  className={`h-full rounded-full bg-gradient-to-r shadow-sm transition-all duration-1000 ${
                    high ? 'from-[#3d68e8] to-[#1d3fae]' : mid ? 'from-[#8aa4f2] to-[#3d68e8]' : 'from-[#c7d6fb] to-[#8aa4f2]'
                  }`}
                  style={{ width: `${Math.max(widthPct, 3)}%` }}
                  title={`${p.score}/10 in ${formatDuration(p.timeTakenSeconds)}`}
                />
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-indigo-500/80 drop-shadow-[0_0_2px_rgba(99,102,241,0.5)] z-10"
                  style={{ left: `${(avgTime / MAX_SECONDS) * 100}%` }}
                  title={`Your avg: ${formatDuration(avgTime)}`}
                />
              </div>
              <span className="text-right font-mono text-[12px] font-semibold tabular-nums text-slate-500">
                {formatDuration(p.timeTakenSeconds)}
              </span>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function ConsistencyBandTile({ personal }: { personal: PersonalStatsResponse }) {
  // Always show every domain so unattempted ones are visible, not missing.
  const byDomain = new Map(personal.domainRanges.map((r) => [r.domain, r]))
  const rows = ALL_DOMAINS.map((domain) => ({
    domain,
    range: byDomain.get(domain) ?? null,
  }))

  return (
    <Tile
      title="Score range by domain"
      note="Short bar = steady scores. Long bar = scores jump around. Dot = your average."
      testId="consistency-band-tile"
      className="flex-1 flex flex-col h-full w-full"
    >
      <div className="mb-6 flex items-center justify-center gap-8 text-[10.5px] text-[var(--ink-soft)] font-medium uppercase tracking-widest bg-white/40 p-3 rounded-xl">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-10 rounded-full bg-indigo-500 opacity-30" />
          min → max
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
          average
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-between space-y-6">
        {rows.map(({ domain, range: r }) => {
          if (!r) {
            return (
              <div key={domain} className="group">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wide" title={domainLabel(domain)}>
                    {domainLabel(domain)}
                  </span>
                  <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">Not attempted yet</span>
                </div>
                <div className="relative h-4 w-full rounded-full bg-slate-100 shadow-inner" />
              </div>
            )
          }

          const spread = r.max - r.min
          const steady = spread <= 1
          const swingLabel = steady ? 'Steady' : spread <= 3 ? 'Some swing' : 'Wide swing'
          return (
            <div key={domain} className="group">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-bold text-[var(--ink)] uppercase tracking-wide" title={domainLabel(domain)}>
                  {domainLabel(domain)}
                </span>
                <span className="text-[10.5px] font-semibold text-[var(--ink-soft)] tracking-wide">
                  <span className={steady ? 'text-[#1d3fae]' : spread <= 3 ? 'text-[#3d68e8]' : 'text-[#8aa4f2]'}>{swingLabel}</span>
                  <span className="opacity-50 mx-1">·</span>
                  {r.count} attempt{r.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="relative h-4 w-full rounded-full bg-slate-100 shadow-inner">
                <div
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)] opacity-40 transition-all duration-1000"
                  style={{
                    left: `${(r.min / 10) * 100}%`,
                    width: `${Math.max(((r.max - r.min) / 10) * 100, 2)}%`,
                  }}
                />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.8)] z-10"
                  style={{ left: `${(r.mean / 10) * 100}%` }}
                  title={`Average ${r.mean}`}
                />
              </div>
              <div className="mt-2 grid grid-cols-3 font-mono text-[11px] font-semibold tabular-nums text-slate-500">
                <span>
                  Low <b className="text-[var(--ink)]">{r.min}</b>
                </span>
                <span className="text-center">
                  Avg <b className="text-[var(--ink)] text-[12px]">{r.mean}</b>
                </span>
                <span className="text-right">
                  Best <b className="text-[var(--ink)]">{r.max}</b>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function RecentAttemptsTile({ personal }: { personal: PersonalStatsResponse }) {
  const attempts = personal.recentAttempts.slice(0, 6)
  if (attempts.length === 0) {
    return (
      <Tile title="Recent attempts" className="flex-1 w-full">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  return (
    <Tile title="Recent attempts" testId="recent-attempts-tile" className="flex-1 w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse mt-2">
          <thead>
            <tr className="border-b-2 border-[var(--line)]">
              <th className="py-2 pr-2 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] w-[40%]">Domain</th>
              <th className="py-2 pr-2 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] text-center w-[20%]">Score</th>
              <th className="py-2 pr-2 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] text-center w-[20%]">Date</th>
              <th className="py-2 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] text-right w-[20%]">vs. last</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]/50">
            {attempts.map((a, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors group">
                <td className="py-2.5 pr-2 text-[12px] font-semibold text-[var(--ink)]">
                  {domainLabel(a.domain)}
                </td>
                <td className="py-2.5 pr-2 text-center font-mono font-extrabold text-[13px] text-slate-800">
                  {a.score}
                </td>
                <td className="py-2.5 pr-2 text-center font-mono text-[10px] font-medium text-slate-500">
                  {formatDate(a.completedAt)}
                </td>
                <td className={`py-2.5 text-right font-mono font-bold text-[12px] ${changeClass(a.scoreChangeFromPrevious)}`}>
                  {a.scoreChangeFromPrevious !== null ? (
                    <span className="flex items-center justify-end gap-1">
                      {a.scoreChangeFromPrevious > 0 && <span className="text-[10px]">▲</span>}
                      {a.scoreChangeFromPrevious < 0 && <span className="text-[10px]">▼</span>}
                      {a.scoreChangeFromPrevious === 0 && <span className="text-[10px] opacity-50">—</span>}
                      {formatChange(a.scoreChangeFromPrevious)}
                    </span>
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tile>
  )
}

// ===== Chapter 2: Where you stand =====

/** Short scope labels so "State / Region" doesn't wrap and break column alignment. */
const SCOPE_LABELS: Record<string, string> = {
  City: 'City',
  State: 'State',
  'State / Region': 'State',
  Country: 'Country',
  Global: 'Global',
}

function RankLadderTile({ stats, domain }: { stats: StatsResponse; domain: Domain }) {
  const rungs = stats.rankLadder
  if (rungs.length === 0) {
    return (
      <Tile title="Your rank">
        <EmptyNote text="Not enough data yet for this filter." />
      </Tile>
    )
  }

  return (
    <Tile
      title="Your rank"
      note={`${DOMAIN_LABELS[domain]} · percentile = % of people you outscored (higher is better)`}
      testId="rank-ladder-tile"
    >
      {/* Each rung is a full-width block, not a cramped grid row — the tile
          has the height to spare, so let the percentile bar run the full
          width instead of squeezing everything into fixed columns. */}
      <div className="mt-2 space-y-5">
        {rungs.map((rung) => {
          const scopeLabel = SCOPE_LABELS[rung.scope] ?? rung.scope
          const pct = rung.percentile ?? 0
          return (
            <div key={rung.scope}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                    {scopeLabel}
                  </p>
                  <p className="truncate text-[13px] font-semibold text-[var(--ink)]" title={rung.label}>
                    {rung.label}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-mono text-[15px] font-bold text-[var(--ink)]">
                    {rung.rank !== null ? (
                      <>
                        #{rung.rank}
                        <span className="text-[var(--ink-soft)]">/{rung.cohortSize}</span>
                      </>
                    ) : (
                      <span className="text-[var(--ink-soft)]">—</span>
                    )}
                  </p>
                  <p className="text-[10px] font-medium text-[var(--ink-soft)]">
                    {rung.percentile !== null ? `${rung.percentile}${ordinalSuffix(rung.percentile)} percentile` : 'No percentile yet'}
                  </p>
                </div>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--paper)]">
                {rung.percentile !== null && (
                  <div
                    // Always render at least a thin sliver — a 0th-percentile
                    // bar with 0% width was visually indistinguishable from
                    // "no data", even though it's a real, valid value.
                    className="h-full rounded-full bg-[var(--signal)]"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                    title={`${pct}${ordinalSuffix(pct)} percentile — you outscored ${pct}% of peers`}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function NeighborsTile({ stats }: { stats: StatsResponse }) {
  const rows = stats.neighbors
  if (rows.length === 0) {
    return (
      <Tile title="People near your rank">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile
      title="People near your rank"
      note="Scores just above and below you"
      testId="neighbors-tile"
    >
      <div className="mt-2 flex-1 flex flex-col justify-center">
        <div className="overflow-hidden rounded-lg border border-[var(--line)]">
          {rows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 px-5 py-4 text-[14px] ${
                i > 0 ? 'border-t border-[var(--line)]' : ''
              } ${row.isYou ? 'bg-[var(--signal-soft)] font-bold text-[var(--signal)]' : 'text-[var(--ink)]'}`}
            >
              <span className="font-mono tabular-nums text-[var(--ink-soft)]">#{row.rank}</span>
              <span className="truncate" title={row.name}>
                {row.isYou ? 'You' : row.name}
              </span>
              <span className="font-mono tabular-nums font-semibold">{row.score}/10</span>
            </div>
          ))}
        </div>
      </div>
    </Tile>
  )
}

// Crowd-wide numbers (median/mode/top/low/avg time/test-takers) that were
// already fetched for the histogram but had no home in the new layout.
function CommunitySnapshotTile({ stats }: { stats: StatsResponse }) {
  if (stats.totalUsers === 0) {
    return (
      <Tile title="Crowd snapshot">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const items = [
    { label: 'Test-takers', value: String(stats.totalUsers) },
    { label: 'Median', value: stats.medianScore !== null ? `${stats.medianScore}/10` : '—' },
    { label: 'Most common', value: stats.modeScore !== null ? `${stats.modeScore}/10` : '—' },
    { label: 'Top score', value: stats.topScore !== null ? `${stats.topScore}/10` : '—' },
    { label: 'Lowest', value: stats.lowScore !== null ? `${stats.lowScore}/10` : '—' },
    {
      label: 'Avg time',
      value: stats.averageTimeSeconds !== null ? formatDuration(stats.averageTimeSeconds) : '—',
    },
  ]

  return (
    <Tile
      title="Crowd snapshot"
      note="Updates when you change domain, designation, experience, or location above"
      testId="community-snapshot-tile"
    >
      <div className="grid flex-1 grid-cols-3 auto-rows-fr gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col justify-center rounded-lg bg-[var(--paper)] px-2.5 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {item.label}
            </p>
            <p className="mt-1 font-mono text-base font-bold leading-tight text-[var(--ink)]">{item.value}</p>
          </div>
        ))}
      </div>
    </Tile>
  )
}

// The currently-selected domain's own latest-vs-previous story — distinct
// from the cross-domain Hero row, and from Recent Attempts (which lists every
// domain). userProgress was already fetched by /api/stats but had no widget.
function ThisDomainTile({ stats, domain }: { stats: StatsResponse; domain: Domain }) {
  const progress = stats.userProgress
  if (progress.attemptCount === 0) {
    return (
      <Tile title="This domain" note={DOMAIN_LABELS[domain]}>
        <EmptyNote text="You haven't attempted this domain yet." />
      </Tile>
    )
  }

  return (
    <Tile title="This domain" note={DOMAIN_LABELS[domain]} testId="this-domain-tile">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Latest</p>
            <p className="mt-1.5 font-mono text-3xl font-bold text-[var(--ink)]">{progress.latestScore}/10</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Best</p>
            <p className="mt-1.5 font-mono text-3xl font-bold text-[var(--ink)]">{progress.bestScore}/10</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">vs last</p>
            <p className={`mt-1.5 font-mono text-2xl font-bold ${changeClass(progress.scoreChange)}`}>
              {formatChange(progress.scoreChange)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Attempts</p>
            <p className="mt-1.5 font-mono text-2xl font-bold text-[var(--ink)]">{progress.attemptCount}</p>
          </div>
        </div>
        {progress.averageTimePerQuestionSeconds != null && (
          <p className="text-[11px] text-[var(--ink-soft)] border-t border-[var(--line)] pt-4">
            ~{progress.averageTimePerQuestionSeconds}s per question ·{' '}
            {progress.scorePerMinute != null ? `${progress.scorePerMinute} pts/min` : null}
          </p>
        )}
      </div>
    </Tile>
  )
}

function LocationComparisonTile({ stats }: { stats: StatsResponse }) {
  const items = stats.locationComparisons
  if (items.length === 0) {
    return (
      <Tile title="Average score by place" className="w-full h-full">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const yourScore = stats.yourScore

  return (
    <Tile
      title="Average score by place"
      note={
        yourScore !== null
          ? `Bar = crowd avg (0–10). Your latest here: ${yourScore}/10. Δ = you minus avg.`
          : 'Bar = crowd avg score (0–10) at each place'
      }
      testId="location-comparison-tile"
      className="w-full h-full"
    >
      <div className="mb-2 grid grid-cols-[5.5rem_1fr_2.5rem_2.5rem] items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-[var(--ink-soft)] px-1">
        <span>Place</span>
        <span>Avg score (0 → 10)</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Δ You</span>
      </div>
      <div className="space-y-4 mt-2 flex-1 flex flex-col justify-center">
        {items.map((item) => {
          const avg = item.averageScore
          const vsYou =
            yourScore !== null && avg !== null ? roundToOne(yourScore - avg) : null
          return (
            <div key={item.scope} className="grid grid-cols-[5.5rem_1fr_2.5rem_2.5rem] items-center gap-3 group">
              <div className="min-w-0 flex flex-col">
                <p className="truncate text-[12px] font-bold text-slate-800" title={item.label}>
                  {item.label}
                </p>
                <p className="text-[9px] uppercase tracking-widest font-semibold text-indigo-500/70">{item.scope}</p>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                {avg !== null && (
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000"
                    style={{ width: `${(avg / 10) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-right font-mono text-[13px] font-extrabold tabular-nums text-indigo-600">
                {avg ?? '—'}
              </span>
              <span className={`text-right font-mono text-[11px] font-bold tabular-nums ${changeClass(vsYou)}`}>
                {vsYou === null ? (
                  <span className="opacity-50">—</span>
                ) : (
                  <span className="flex items-center justify-end gap-0.5">
                    {vsYou > 0 && <span className="text-[9px]">▲</span>}
                    {vsYou < 0 && <span className="text-[9px]">▼</span>}
                    {vsYou === 0 && <span className="text-[9px] opacity-50">—</span>}
                    {vsYou > 0 ? `+${vsYou}` : String(vsYou)}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function DomainCompareTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.domainRadar
  const hasData = points.some((p) => p.you !== null || p.city !== null || p.country !== null)
  if (!hasData) {
    return (
      <Tile title="You vs. crowd by domain">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  // Recharts hard-skips rendering a Bar rect (Bar.js: `width === 0 ... return
  // null`) whenever a value is null OR literally 0 — so domains you haven't
  // attempted end up with only 2 of 3 bars, and the remaining bars shift up
  // out of alignment with the fully-attempted rows. A hairline epsilon keeps
  // the rect (and its slot) without reading as a real score; the *Raw fields
  // let the tooltip still say "Not attempted" instead of "0/10".
  const NO_DATA_EPSILON = 0.05
  const data = points.map(p => ({
    subject: radarLabel(p.domain),
    You: p.you ?? NO_DATA_EPSILON,
    City: p.city ?? NO_DATA_EPSILON,
    Country: p.country ?? NO_DATA_EPSILON,
    YouRaw: p.you,
    CityRaw: p.city,
    CountryRaw: p.country,
  }))

  return (
    <Tile
      title="You vs. crowd by domain"
      note="Score out of 10 across domains. Hover to see exact scores."
      testId="domain-radar-tile"
      className="w-full h-full"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-3 text-[10px] text-[var(--ink-soft)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[var(--signal)]" /> You
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#8aa4f2]" /> City avg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-[#c7d6fb]" /> Country avg
        </span>
      </div>
      <div className="mt-2 flex-1 min-h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--line)" />
            <XAxis type="number" domain={[0, 10]} hide />
            <YAxis dataKey="subject" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--ink)' }} width={55} />
            <RechartsTooltip
              cursor={{ fill: 'var(--paper)' }}
              contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)', borderRadius: '8px', fontSize: '11px', padding: '4px 8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ color: 'var(--ink)' }}
              formatter={(_value, name, entry) => {
                const payload = entry.payload as Record<string, number | null> | undefined
                const raw = payload?.[`${entry.dataKey}Raw`]
                return [raw === null || raw === undefined ? 'Not attempted' : `${raw}/10`, name ?? '']
              }}
            />
            <Bar dataKey="You" fill="var(--signal)" radius={[0, 2, 2, 0]} />
            <Bar dataKey="City" fill="#8aa4f2" radius={[0, 2, 2, 0]} />
            <Bar dataKey="Country" fill="#c7d6fb" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Tile>
  )
}

function PeerGroupsTile({ stats }: { stats: StatsResponse }) {
  const rows = stats.peerGroupRanks.filter((row) => row.rank !== null)
  if (rows.length === 0) {
    return (
      <Tile title="Peer groups">
        <EmptyNote text="Not enough data yet in any of your peer groups." />
      </Tile>
    )
  }

  return (
    <Tile
      title="Peer groups"
      note="How you rank inside each group you belong to"
      testId="peer-groups-tile"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.dimension}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)]/50 px-5 py-4"
          >
            <p className="text-[12.5px] font-semibold text-[var(--ink)]">
              {row.dimension} · {row.label}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[9.5px] uppercase tracking-wide text-[var(--ink-soft)]">You</p>
                <p className="mt-0.5 font-mono text-base font-bold text-[var(--ink)]">{stats.yourScore ?? '—'}</p>
              </div>
              <div>
                <p className="text-[9.5px] uppercase tracking-wide text-[var(--ink-soft)]">Avg</p>
                <p className="mt-0.5 font-mono text-base font-bold text-[var(--ink-soft)]">{row.averageScore ?? '—'}</p>
              </div>
              <div>
                <p className="text-[9.5px] uppercase tracking-wide text-[var(--ink-soft)]">Rank</p>
                <p className="mt-0.5 font-mono text-base font-bold text-[var(--signal)]">
                  #{row.rank}
                  <span className="text-[10.5px] font-normal text-[var(--ink-soft)]">/{row.cohortSize}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Tile>
  )
}

function TopStatesTile({ stats }: { stats: StatsResponse }) {
  if (stats.averageScoreByState.length === 0 && stats.testTakersByState.length === 0) {
    return (
      <Tile title="Top states">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile title="Top states" testId="top-states-tile">
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <TopGroupTrack title="Highest avg" items={stats.averageScoreByState} />
        <TopGroupTrack
          title="Most active"
          items={stats.testTakersByState.map((item) => ({ ...item, averageScore: item.count }))}
        />
      </div>
    </Tile>
  )
}

function TopGroupTrack({ title, items }: { title: string; items: StatsResponse['topCitiesByScore'] }) {
  return (
    <div>
      <h4 className="mb-3 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h4>
      <table className="w-full text-[13.5px]">
        <tbody className="divide-y divide-[var(--line)]">
          {items.map((item) => (
            <tr
              key={item.label}
              className={item.isYou ? 'font-bold text-[var(--signal)]' : ''}
            >
              <td className="w-5 py-3 pr-3 font-mono text-[var(--ink-soft)]">{item.rank}</td>
              <td className="truncate py-3 pr-4">{item.label}</td>
              <td className="py-3 text-right font-mono">{item.averageScore ?? item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TopCitiesTile({ stats }: { stats: StatsResponse }) {
  if (stats.topCitiesByScore.length === 0 && stats.topCitiesByParticipation.length === 0) {
    return (
      <Tile title="Top cities">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile title="Top cities" testId="top-cities-tile">
      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <TopGroupTrack title="Highest avg" items={stats.topCitiesByScore} />
        <TopGroupTrack
          title="Most active"
          items={stats.topCitiesByParticipation.map((item) => ({ ...item, averageScore: item.count }))}
        />
      </div>
    </Tile>
  )
}

// ===== Top-level export =====

interface CommunityInsightsProps {
  domain: Domain
  loading: boolean
  error: string
  stats: StatsResponse | null
  personal: PersonalStatsResponse | null
  communityScope: string
  hasSpecificCommunity: boolean
}

export default function CommunityInsights({
  domain,
  loading,
  error,
  stats,
  personal,
  communityScope,
  hasSpecificCommunity,
}: CommunityInsightsProps) {
  if (loading) {
    return <p className="animate-pulse text-sm text-[var(--ink-soft)]">Loading your stats…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  if (!stats || !personal) {
    return null
  }

  return (
    <div className="space-y-10" data-testid="community-insights">
      <ChartGradients />
      {stats.totalUsers === 0 && (
        <p className="text-sm text-[var(--ink-soft)]" data-testid="no-attempts-yet">
          Nobody in {hasSpecificCommunity ? communityScope : 'this group'} has taken the {DOMAIN_LABELS[domain]}{' '}
          test yet — be the first!
        </p>
      )}

      <HeroRow stats={stats} personal={personal} />

      {/* ===== Chapter 1: You, over time =====
          Every tile here is drawn from the user's own attempt history and spans
          all domains, so nothing in this section changes when the designation,
          experience, or location filters change — it's grouped on purpose. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">You, over time</h2>
          <p className="text-sm text-[var(--ink-soft)]">Your own attempts and progress across every domain.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Overview: the trend line wants width; the coverage donut sits beside it */}
          <div className="flex md:col-span-8">
            <ScoreTrendTile personal={personal} />
          </div>
          <div className="flex md:col-span-4">
            <DomainsCoveredTile personal={personal} />
          </div>

          {/* Activity facts beside the when-you-test-best heatmap — matched height */}
          <div className="flex md:col-span-6">
            <YourActivityTile personal={personal} />
          </div>
          <div className="flex md:col-span-6">
            <WhenYouTestBestTile personal={personal} />
          </div>

          {/* The two deep-dive panels get a roomy half each so their rows breathe */}
          <div className="flex md:col-span-6">
            <ConsistencyBandTile personal={personal} />
          </div>
          <div className="flex md:col-span-6">
            <PaceVsAccuracyTile personal={personal} />
          </div>

          {/* Recent history table beside the you-vs-crowd-by-domain chart */}
          <div className="flex md:col-span-8">
            <RecentAttemptsTile personal={personal} />
          </div>
          <div className="flex md:col-span-4">
            <DomainCompareTile personal={personal} />
          </div>
        </div>
      </section>

      {/* ===== Chapter 2: Where you stand =====
          Every tile here is computed from the crowd for the current filters, so
          this whole section is what responds when the domain, designation,
          experience, or location filters above are changed. */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Where you stand</h2>
          <p className="text-sm text-[var(--ink-soft)]">How you compare against everyone matching the filters above.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Crowd overview: three compact, similarly-sized summary cards.
              Keeping "This domain" here (next to short tiles) stops it from
              stretching tall and leaving the empty gap it had before. */}
          <div className="flex md:col-span-4">
            <ScoreDistributionTile stats={stats} />
          </div>
          <div className="flex md:col-span-4">
            <CommunitySnapshotTile stats={stats} />
          </div>
          <div className="flex md:col-span-4">
            <ThisDomainTile stats={stats} domain={domain} />
          </div>

          {/* Your ranking: two panels of similar height, side by side */}
          <div className="flex md:col-span-6">
            <RankLadderTile stats={stats} domain={domain} />
          </div>
          <div className="flex md:col-span-6">
            <NeighborsTile stats={stats} />
          </div>

          {/* The two two-track geographic leaderboards */}
          <div className="flex md:col-span-6">
            <TopStatesTile stats={stats} />
          </div>
          <div className="flex md:col-span-6">
            <TopCitiesTile stats={stats} />
          </div>

          {/* Peer groups laid out wide so the cards sit side by side instead of
              stacking into a tall narrow column */}
          <div className="flex md:col-span-12">
            <PeerGroupsTile stats={stats} />
          </div>

          {/* Full-width place comparison closes the section */}
          <div className="flex md:col-span-12">
            <LocationComparisonTile stats={stats} />
          </div>
        </div>
      </section>
    </div>
  )
}
