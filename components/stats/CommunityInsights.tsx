'use client'

import type { ReactNode } from 'react'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_LABELS_SHORT } from '@/lib/domains'
import { roundToOne } from '@/lib/stats-calculations'
import type { PersonalStatsResponse, StatsResponse } from '@/lib/stats-types'

// A single-hue ramp (not a rainbow) so per-domain color-coding reads as "one
// accent, several weights" — matches the convention already used for the
// role donut elsewhere on this page.
const CHART_COLORS = ['#1d3fae', '#3d68e8', '#5c82ec', '#8aa4f2', '#b6c6f7', '#e2eafc']

function domainColor(domain: string) {
  const index = ALL_DOMAINS.indexOf(domain as Domain)
  return CHART_COLORS[index === -1 ? 0 : index % CHART_COLORS.length]
}

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

function ordinalSuffix(n: number) {
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 13) return 'th'
  if (last === 1) return 'st'
  if (last === 2) return 'nd'
  if (last === 3) return 'rd'
  return 'th'
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
  // Content-sized only — never force height. Stretching short content leaves
  // hollow white space inside the card.
  return (
    <div
      className={`min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm flex flex-col ${className}`}
      data-testid={testId}
    >
      {title && <p className="mb-0.5 text-[13px] font-semibold leading-tight text-[var(--ink)]">{title}</p>}
      {note && <p className="mb-1.5 text-[10.5px] leading-snug text-[var(--ink-soft)]">{note}</p>}
      <div className="min-w-0 flex-1 flex flex-col">{children}</div>
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[11.5px] text-[var(--ink-soft)]">{text}</p>
}

function Chapter({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h2>
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>
      {note && <p className="-mt-0.5 text-[11px] text-[var(--ink-soft)]">{note}</p>}
      {children}
    </section>
  )
}

/** Side-by-side row; each tile keeps its natural height (no hollow stretch). */
function Pair({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">{children}</div>
}

function Triple({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

// ===== Hero row =====

function HeroRow({ stats, personal }: { stats: StatsResponse; personal: PersonalStatsResponse }) {
  const testsTaken = stats.userProgress.attemptCount
  const averageScore = stats.userProgress.consistency.averageScore
  const bestScore = stats.userProgress.bestScore
  const scoreChange = stats.userProgress.scoreChange

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      data-testid="hero-row"
    >
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Tests taken</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[var(--ink)]">{testsTaken}</p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Average score</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[var(--ink)]">{averageScore ?? '—'}</p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Best score</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[var(--ink)]">
          {bestScore ?? '—'}
          {bestScore !== null && <span className="text-sm font-normal text-[var(--ink-soft)]">/10</span>}
        </p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Percentile</p>
        <p className="mt-1 font-mono text-2xl font-bold text-[var(--ink)]">
          {stats.percentile !== null ? (
            <>
              {stats.percentile}
              <span className="text-sm font-normal">%</span>
            </>
          ) : (
            '—'
          )}
        </p>
      </Tile>
      <Tile testId="score-change-tile" className="col-span-2 sm:col-span-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Score change</p>
        {scoreChange === null ? (
          <p className="mt-1 font-mono text-2xl font-bold text-[var(--ink-soft)]">—</p>
        ) : (
          <p className={`mt-1 font-mono text-2xl font-bold ${changeClass(scoreChange)}`}>
            {formatChange(scoreChange)}
          </p>
        )}
      </Tile>
    </div>
  )
}

// ===== Chapter 1: You, over time =====

function ScoreTrendTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.pacePoints.slice(-12)
  if (points.length === 0) {
    return (
      <Tile title="Score trend">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  // Plot in a 0–100 × 0–100 space so width stretch is independent of height.
  // Labels stay HTML (always sharp). Dots stay HTML circles (never oval-blur).
  // SVG strokes use non-scaling-stroke so they stay crisp when stretched.
  const coords = points.map((p, i) => ({
    x: points.length === 1 ? 50 : (i / (points.length - 1)) * 100,
    y: 100 - (Math.max(0, Math.min(10, p.score)) / 10) * 100,
    score: p.score,
  }))
  const polylinePoints = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
  const areaPoints = `0,100 ${polylinePoints} 100,100`
  const yTicks = [0, 5, 10]

  return (
    <Tile
      title="Score trend"
      note="Y = score /10 · X = attempts (oldest → newest)"
      testId="score-trend"
    >
      <div
        className="mt-1 flex gap-1.5"
        role="img"
        aria-label="Score trend: score on Y axis, attempts left to right from oldest to newest"
      >
        {/* Y-axis labels (HTML — never stretched) */}
        <div className="flex w-4 flex-col justify-between pb-4 pt-0.5 text-right font-mono text-[10px] leading-none text-[var(--ink-soft)]">
          {[...yTicks].reverse().map((score) => (
            <span key={score}>{score}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-[112px] w-full">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              overflow="visible"
            >
              {yTicks.map((score) => {
                const y = 100 - (score / 10) * 100
                return (
                  <line
                    key={score}
                    x1={0}
                    y1={y}
                    x2={100}
                    y2={y}
                    stroke="var(--line)"
                    strokeWidth={1}
                    opacity={score === 0 ? 1 : 0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
              <polygon points={areaPoints} fill="var(--signal-soft)" opacity={0.55} />
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="var(--signal)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Dots as HTML so they stay circular and sharp */}
            {coords.map((c, i) => {
              const isLast = i === coords.length - 1
              return (
                <span
                  key={i}
                  title={`Attempt ${i + 1}: ${c.score}/10`}
                  className={`absolute rounded-full bg-[var(--signal)] ${
                    isLast ? 'h-2.5 w-2.5 ring-2 ring-white' : 'h-2 w-2 opacity-90'
                  }`}
                  style={{
                    left: `${c.x}%`,
                    top: `${c.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )
            })}
          </div>

          <div className="mt-1 flex justify-between text-[10px] text-[var(--ink-soft)]">
            <span>Oldest</span>
            <span>Attempt →</span>
            <span>Newest</span>
          </div>
        </div>
      </div>
    </Tile>
  )
}

function StreakTile({ personal }: { personal: PersonalStatsResponse }) {
  const { currentStreak, longestStreak } = personal.streaks
  const flames = Array.from({ length: 7 }, (_, i) => i < Math.min(currentStreak, 7))
  return (
    <Tile title="Streak" testId="streak-tile">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xl font-bold leading-none text-[var(--ink)]">
          {currentStreak}
          <span className="ml-1 text-[10px] font-normal text-[var(--ink-soft)]">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </p>
        <div className="flex w-16 gap-[2px]" aria-hidden="true">
          {flames.map((on, i) => (
            <div
              key={i}
              className={`h-4 flex-1 rounded-[2px] ${on ? 'bg-[var(--signal)]' : 'bg-[var(--paper)]'}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-1 text-[10px] text-[var(--ink-soft)]">
        Best <span className="font-mono font-semibold text-[var(--ink)]">{longestStreak}</span>
      </p>
    </Tile>
  )
}

// GitHub contribution-graph: fluid cells fill the card width (still fixed rows = days).
const ACTIVITY_WEEKS = 53

function ActivityTile({ personal }: { personal: PersonalStatsResponse }) {
  const countByDate = new Map(personal.activityCalendar.map((d) => [d.date, d.count]))
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const endDay = end.getDay() // 0 = Sunday
  const totalDays = ACTIVITY_WEEKS * 7
  const start = new Date(end)
  start.setDate(end.getDate() - ((ACTIVITY_WEEKS - 1) * 7 + endDay))

  const cells: Array<{ date: string; count: number; future: boolean; week: number; month: number }> = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const future = d > end
    cells.push({
      date: key,
      count: future ? 0 : (countByDate.get(key) ?? 0),
      future,
      week: Math.floor(i / 7),
      month: d.getMonth(),
    })
  }

  const maxCount = Math.max(1, ...cells.filter((c) => !c.future).map((c) => c.count))
  const activeDays = cells.filter((c) => !c.future && c.count > 0).length
  const totalAttempts = cells.reduce((sum, c) => sum + (c.future ? 0 : c.count), 0)

  const levelColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39']
  function levelFor(count: number, future: boolean) {
    if (future || count === 0) return 0
    if (maxCount === 1) return 1
    const ratio = count / maxCount
    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2
    return 1
  }

  // Label the week that contains the 1st of each month (GitHub-style).
  const monthLabels: Array<{ week: number; label: string }> = []
  const labeledMonths = new Set<string>()
  for (let week = 0; week < ACTIVITY_WEEKS; week++) {
    for (let day = 0; day < 7; day++) {
      const cell = cells[week * 7 + day]
      if (!cell || cell.future) continue
      const d = new Date(cell.date + 'T12:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (d.getDate() === 1 && !labeledMonths.has(key)) {
        labeledMonths.add(key)
        monthLabels.push({
          week,
          label: d.toLocaleString(undefined, { month: 'short' }),
        })
      }
    }
  }
  // Always label the first week if the year-window starts mid-month.
  if (monthLabels.length === 0 || monthLabels[0].week > 0) {
    const first = cells.find((c) => !c.future)
    if (first) {
      const d = new Date(first.date + 'T12:00:00')
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!labeledMonths.has(key)) {
        monthLabels.unshift({
          week: 0,
          label: d.toLocaleString(undefined, { month: 'short' }),
        })
      }
    }
  }

  const dayLabels = [
    { day: 1, label: 'Mon' },
    { day: 3, label: 'Wed' },
    { day: 5, label: 'Fri' },
  ]

  return (
    <Tile title="Activity" testId="activity-tile">
      <p className="mb-1.5 text-[12px] text-[var(--ink)]">
        <b className="font-mono">{totalAttempts}</b> attempts in the last year
        {activeDays > 0 && (
          <span className="text-[var(--ink-soft)]">
            {' '}
            · <b className="font-mono text-[var(--ink)]">{activeDays}</b> active days
          </span>
        )}
      </p>

      <div className="flex gap-1">
        <div className="grid w-7 flex-shrink-0 grid-rows-7 gap-[3px] pt-[18px] text-right text-[9px] leading-none text-[var(--ink-soft)]">
          {Array.from({ length: 7 }, (_, day) => {
            const hit = dayLabels.find((d) => d.day === day)
            return (
              <span key={day} className="flex items-center justify-end pr-1" style={{ height: 12 }}>
                {hit?.label ?? ''}
              </span>
            )
          })}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="mb-1 grid text-[9px] text-[var(--ink-soft)]"
            style={{ gridTemplateColumns: `repeat(${ACTIVITY_WEEKS}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: ACTIVITY_WEEKS }, (_, week) => {
              const label = monthLabels.find((m) => m.week === week)?.label
              return (
                <span key={week} className="overflow-hidden whitespace-nowrap">
                  {label ?? ''}
                </span>
              )
            })}
          </div>

          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${ACTIVITY_WEEKS}, minmax(0, 1fr))`,
              gridTemplateRows: 'repeat(7, 12px)',
              gridAutoFlow: 'column',
            }}
          >
            {cells.map((cell) => (
              <div
                key={cell.date}
                title={
                  cell.future
                    ? ''
                    : `${cell.date}: ${cell.count} ${cell.count === 1 ? 'attempt' : 'attempts'}`
                }
                className="min-w-0 rounded-[2px]"
                style={{
                  background: cell.future ? 'transparent' : levelColors[levelFor(cell.count, cell.future)],
                  boxShadow: cell.future ? 'none' : 'inset 0 0 0 1px rgba(27, 31, 35, 0.06)',
                }}
              />
            ))}
          </div>

          <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-[var(--ink-soft)]">
            <span className="mr-0.5">Less</span>
            {levelColors.map((c, i) => (
              <span
                key={i}
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{ background: c, boxShadow: 'inset 0 0 0 1px rgba(27, 31, 35, 0.06)' }}
              />
            ))}
            <span className="ml-0.5">More</span>
          </div>
        </div>
      </div>
    </Tile>
  )
}

function DomainsCoveredTile({ personal }: { personal: PersonalStatsResponse }) {
  const attemptedIds = new Set(personal.domainRanges.map((d) => d.domain))
  const attempted = attemptedIds.size
  const total = ALL_DOMAINS.length

  // Proper donut: larger radius, thinner stroke, butt caps so the arc
  // doesn't blob at small sizes (round caps + thick stroke was the issue).
  const size = 44
  const stroke = 5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const fraction = total > 0 ? Math.min(1, attempted / total) : 0
  const progress = circumference * fraction

  return (
    <Tile title="Domains covered" testId="domains-covered-tile">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="#e8eaed"
                strokeWidth={stroke}
              />
              {fraction > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${progress} ${circumference - progress}`}
                />
              )}
            </g>
          </svg>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold tabular-nums text-[var(--ink)]">
            {attempted}
            <span className="text-[9px] font-normal text-[var(--ink-soft)]">/{total}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1">
            {ALL_DOMAINS.map((d) => {
              const on = attemptedIds.has(d)
              return (
                <span
                  key={d}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    on ? 'bg-[var(--signal)] text-white' : 'bg-[var(--paper)] text-[var(--ink-soft)]'
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
      <Tile title="Pace vs. accuracy" note="Did you score higher when you went faster or slower?">
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
      note="Each row is one attempt. Bar length = time used of the 5-minute limit."
      testId="pace-vs-accuracy-tile"
    >
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--ink-soft)]">
        <span>
          Avg time <b className="font-mono text-[var(--ink)]">{formatDuration(avgTime)}</b>
        </span>
        <span>
          Avg score <b className="font-mono text-[var(--ink)]">{avgScore}/10</b>
        </span>
      </div>
      <div className="mb-1 grid grid-cols-[2.5rem_1fr_3.25rem] gap-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
        <span className="text-right">Score</span>
        <span>Time used (0 → 5 min)</span>
        <span className="text-right">Duration</span>
      </div>
      <div className="space-y-2">
        {points.map((p, i) => {
          const widthPct = Math.min(100, (p.timeTakenSeconds / MAX_SECONDS) * 100)
          const high = p.score >= 8
          const mid = p.score >= 5
          return (
            <div key={`${p.completedAt}-${i}`} className="grid grid-cols-[2.5rem_1fr_3.25rem] items-center gap-2">
              <span
                className={`text-right font-mono text-[12px] font-bold tabular-nums ${
                  high ? 'text-green-600' : mid ? 'text-[var(--ink)]' : 'text-red-500'
                }`}
              >
                {p.score}
                <span className="text-[9px] font-normal text-[var(--ink-soft)]">/10</span>
              </span>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--paper)]">
                <div
                  className="h-full rounded-full bg-[var(--signal)]"
                  style={{ width: `${Math.max(widthPct, 3)}%` }}
                  title={`${p.score}/10 in ${formatDuration(p.timeTakenSeconds)}`}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-[var(--ink-soft)] opacity-50"
                  style={{ left: `${(avgTime / MAX_SECONDS) * 100}%` }}
                  title={`Your avg: ${formatDuration(avgTime)}`}
                />
              </div>
              <span className="text-right font-mono text-[10px] tabular-nums text-[var(--ink-soft)]">
                {formatDuration(p.timeTakenSeconds)}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[9.5px] text-[var(--ink-soft)]">
        Thin vertical line = your average time · left of it = faster than usual
      </p>
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
      className="flex-1 flex flex-col"
    >
      <div className="mb-2 flex items-center gap-3 text-[9.5px] text-[var(--ink-soft)]">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-6 rounded-full bg-[var(--signal)] opacity-40" />
          min → max
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--signal)]" />
          average
        </span>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        {rows.map(({ domain, range: r }) => {
          const color = domainColor(domain)
          if (!r) {
            return (
              <div key={domain}>
                <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="text-[11px] font-semibold text-[var(--ink)]" title={domainLabel(domain)}>
                    {domainLabel(domain)}
                  </span>
                  <span className="text-[10px] text-[var(--ink-soft)]">Not attempted yet</span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-[var(--paper)]" />
                <div className="mt-1 grid grid-cols-3 font-mono text-[10px] tabular-nums text-[var(--ink-soft)]">
                  <span>Low —</span>
                  <span className="text-center">Avg —</span>
                  <span className="text-right">Best —</span>
                </div>
              </div>
            )
          }

          const spread = r.max - r.min
          const steady = spread <= 1
          const swingLabel = steady ? 'Steady' : spread <= 3 ? 'Some swing' : 'Wide swing'
          return (
            <div key={domain}>
              <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-semibold text-[var(--ink)]" title={domainLabel(domain)}>
                  {domainLabel(domain)}
                </span>
                <span className="text-[10px] text-[var(--ink-soft)]">
                  {swingLabel} · {r.count} attempt{r.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-[var(--paper)]">
                <div
                  className="absolute inset-y-0.5 rounded-full"
                  style={{
                    left: `${(r.min / 10) * 100}%`,
                    width: `${Math.max(((r.max - r.min) / 10) * 100, 1.5)}%`,
                    background: color,
                    opacity: 0.45,
                  }}
                />
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm"
                  style={{ left: `${(r.mean / 10) * 100}%`, background: color }}
                  title={`Average ${r.mean}`}
                />
              </div>
              <div className="mt-1 grid grid-cols-3 font-mono text-[10px] tabular-nums text-[var(--ink-soft)]">
                <span>
                  Low <b className="text-[var(--ink)]">{r.min}</b>
                </span>
                <span className="text-center">
                  Avg <b className="text-[var(--ink)]">{r.mean}</b>
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

function TotalTimeInvestedTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.pacePoints
  if (points.length === 0) {
    return (
      <Tile title="Time invested">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  const totalSeconds = points.reduce((sum, p) => sum + p.timeTakenSeconds, 0)
  const averageSeconds = Math.round(totalSeconds / points.length)

  return (
    <Tile title="Time invested" testId="total-time-tile">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-[var(--ink-soft)]">Total</p>
          <p className="font-mono text-lg font-bold leading-tight text-[var(--ink)]">
            {formatDuration(totalSeconds)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--ink-soft)]">Avg / try</p>
          <p className="font-mono text-lg font-bold leading-tight text-[var(--ink)]">
            {formatDuration(averageSeconds)}
          </p>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-[var(--ink-soft)]">
        <b className="font-mono text-[var(--ink)]">{points.length}</b> attempts
      </p>
    </Tile>
  )
}

function RecentAttemptsTile({ personal }: { personal: PersonalStatsResponse }) {
  const attempts = personal.recentAttempts.slice(0, 6)
  if (attempts.length === 0) {
    return (
      <Tile title="Recent attempts" className="flex-1">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  return (
    <Tile title="Recent attempts" testId="recent-attempts-tile" className="flex-1">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            <th className="pb-1.5 pr-2">Domain</th>
            <th className="pb-1.5 pr-2">Score</th>
            <th className="pb-1.5 pr-2">Date</th>
            <th className="pb-1.5">vs. last</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a, i) => (
            <tr key={i} className="border-t border-[var(--line)]">
              <td className="py-1.5 pr-2">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[9.5px] font-semibold text-white"
                  style={{ background: domainColor(a.domain) }}
                >
                  {domainLabel(a.domain)}
                </span>
              </td>
              <td className="py-1.5 pr-2 font-mono font-semibold text-[var(--ink)]">{a.score}</td>
              <td className="py-1.5 pr-2 font-mono text-[var(--ink-soft)]">{formatDate(a.completedAt)}</td>
              <td className={`py-1.5 font-mono ${changeClass(a.scoreChangeFromPrevious)}`}>
                {formatChange(a.scoreChangeFromPrevious)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
      note={`${DOMAIN_LABELS[domain]} · blue bar = % of people you outscored (higher is better)`}
      testId="rank-ladder-tile"
    >
      {/* Fixed columns so every "#N of M · place" lines up across rows */}
      <div className="mt-1 space-y-2">
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_4.75rem_minmax(4.5rem,auto)] items-center gap-x-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
          <span>Scope</span>
          <span>Beat rate</span>
          <span className="text-right">Your rank</span>
          <span className="text-right">Place</span>
        </div>
        {rungs.map((rung) => {
          const scopeLabel = SCOPE_LABELS[rung.scope] ?? rung.scope
          const pct = rung.percentile ?? 0
          return (
            <div
              key={rung.scope}
              className="grid grid-cols-[3.25rem_minmax(0,1fr)_4.75rem_minmax(4.5rem,auto)] items-center gap-x-2"
            >
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]" title={rung.scope}>
                {scopeLabel}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--paper)]">
                  {rung.percentile !== null && (
                    <div
                      className="h-full rounded-full bg-[var(--signal)]"
                      style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                      title={`${pct}th percentile — you outscored ${pct}% of peers`}
                    />
                  )}
                </div>
                <span className="w-7 flex-shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--ink-soft)]">
                  {rung.percentile !== null ? `${rung.percentile}%` : '—'}
                </span>
              </div>
              <span className="text-right font-mono text-[11px] tabular-nums text-[var(--ink)]">
                {rung.rank !== null ? (
                  <>
                    <b>#{rung.rank}</b>
                    <span className="text-[var(--ink-soft)]">/{rung.cohortSize}</span>
                  </>
                ) : (
                  <span className="text-[var(--ink-soft)]">—</span>
                )}
              </span>
              <span
                className="truncate text-right text-[11px] text-[var(--ink-soft)]"
                title={rung.label}
              >
                {rung.label}
              </span>
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
      <div className="overflow-hidden rounded-lg border border-[var(--line)]">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-1.5 px-2.5 py-1.5 text-[12px] ${
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
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg bg-[var(--paper)] px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {item.label}
            </p>
            <p className="font-mono text-sm font-bold leading-tight text-[var(--ink)]">{item.value}</p>
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Latest</p>
          <p className="font-mono text-xl font-bold text-[var(--ink)]">{progress.latestScore}/10</p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Best</p>
          <p className="font-mono text-xl font-bold text-[var(--ink)]">{progress.bestScore}/10</p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">vs last</p>
          <p className={`font-mono text-lg font-bold ${changeClass(progress.scoreChange)}`}>
            {formatChange(progress.scoreChange)}
          </p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Attempts</p>
          <p className="font-mono text-lg font-bold text-[var(--ink)]">{progress.attemptCount}</p>
        </div>
      </div>
      {progress.averageTimePerQuestionSeconds != null && (
        <p className="mt-2 text-[10.5px] text-[var(--ink-soft)]">
          ~{progress.averageTimePerQuestionSeconds}s per question ·{' '}
          {progress.scorePerMinute != null ? `${progress.scorePerMinute} pts/min` : null}
        </p>
      )}
    </Tile>
  )
}

function LocationComparisonTile({ stats }: { stats: StatsResponse }) {
  const items = stats.locationComparisons
  if (items.length === 0) {
    return (
      <Tile title="Average score by place">
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
          ? `Bar = crowd average (0–10). Your latest here: ${yourScore}/10. Δ = you minus average.`
          : 'Bar = crowd average score (0–10) at each place'
      }
      testId="location-comparison-tile"
    >
      <div className="mb-1 grid grid-cols-[4.5rem_1fr_2.5rem_2rem] items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
        <span>Place</span>
        <span>Avg score</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Δ you</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const avg = item.averageScore
          const vsYou =
            yourScore !== null && avg !== null ? roundToOne(yourScore - avg) : null
          return (
            <div key={item.scope} className="grid grid-cols-[4.5rem_1fr_2.5rem_2rem] items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-[var(--ink)]" title={item.label}>
                  {item.label}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">{item.scope}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--paper)]">
                {avg !== null && (
                  <div
                    className="h-full rounded-full bg-[var(--signal)]"
                    style={{ width: `${(avg / 10) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-right font-mono text-[12px] font-bold tabular-nums text-[var(--ink)]">
                {avg ?? '—'}
              </span>
              <span className={`text-right font-mono text-[10px] tabular-nums ${changeClass(vsYou)}`}>
                {vsYou === null ? '—' : vsYou > 0 ? `+${vsYou}` : String(vsYou)}
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

  // Always bars — radar legends (solid/dashed/dotted) were unreadable.
  return (
    <Tile
      title="You vs. crowd by domain"
      note="Bar length = average score out of 10. City/country use the location filter above."
      testId="domain-radar-tile"
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
        <span className="text-[9px]">(scale 0–10)</span>
      </div>
      <div className="space-y-2">
        {points.map((p) => {
          const series = [
            { key: 'you', label: 'You', value: p.you, color: 'var(--signal)' },
            { key: 'city', label: 'City', value: p.city, color: '#8aa4f2' },
            { key: 'country', label: 'Country', value: p.country, color: '#c7d6fb' },
          ]
          return (
            <div key={p.domain}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[var(--ink)]">{radarLabel(p.domain)}</span>
                {p.you === null && (
                  <span className="text-[10px] text-[var(--ink-soft)]">Not attempted yet</span>
                )}
              </div>
              <div className="flex h-3.5 items-stretch gap-1">
                {series.map((s) => (
                  <div key={s.key} className="relative min-w-0 flex-1 overflow-hidden rounded bg-[var(--paper)]" title={`${s.label}: ${s.value ?? 'n/a'}`}>
                    {s.value !== null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded"
                        style={{ width: `${(s.value / 10) * 100}%`, background: s.color }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-0.5 grid grid-cols-3 gap-1 text-center font-mono text-[9px] tabular-nums text-[var(--ink-soft)]">
                {series.map((s) => (
                  <span key={s.key}>{s.value ?? '—'}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}

function ScoreDistributionTile({ stats }: { stats: StatsResponse }) {
  if (stats.totalUsers === 0) {
    return (
      <Tile title="How the crowd scored" note="Number of people at each score 0–10">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const maxCount = Math.max(1, ...stats.histogram)
  const yourScore = stats.yourScore

  return (
    <Tile
      title="How the crowd scored"
      note={
        yourScore !== null
          ? `Y = number of people · X = score (0–10) · dark bar = your score (${yourScore}/10)`
          : 'Y = number of people · X = score (0–10) · taller = more people'
      }
      testId="score-distribution-tile"
    >
      <div className="mt-1 flex gap-1">
        <div className="flex w-5 flex-col justify-between pb-4 pt-0.5 text-right font-mono text-[8px] text-[var(--ink-soft)]">
          <span>{maxCount}</span>
          <span>0</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-20 items-end gap-1">
            {stats.histogram.map((count, score) => {
              const isYou = yourScore === score
              return (
                <div key={score} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5">
                  <span className="font-mono text-[8px] tabular-nums text-[var(--ink-soft)]">
                    {count > 0 ? count : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-sm ${isYou ? 'bg-[var(--signal)]' : 'bg-[var(--signal-soft)]'}`}
                    style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '3px' : '0' }}
                    title={`${count} people scored ${score}/10${isYou ? ' (you)' : ''}`}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {stats.histogram.map((_, score) => (
              <span
                key={score}
                className={`flex-1 text-center font-mono text-[8px] ${
                  yourScore === score ? 'font-bold text-[var(--signal)]' : 'text-[var(--ink-soft)]'
                }`}
              >
                {score}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-center text-[9px] text-[var(--ink-soft)]">Score →</p>
        </div>
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
    <Tile title="Peer groups" testId="peer-groups-tile">
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.dimension}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper)]/50 px-3 py-2.5"
          >
            <p className="text-[11px] font-semibold text-[var(--ink)]">
              {row.dimension} · {row.label}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">You</p>
                <p className="font-mono text-sm font-bold text-[var(--ink)]">{stats.yourScore ?? '—'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">Avg</p>
                <p className="font-mono text-sm font-bold text-[var(--ink-soft)]">{row.averageScore ?? '—'}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wide text-[var(--ink-soft)]">Rank</p>
                <p className="font-mono text-sm font-bold text-[var(--signal)]">
                  #{row.rank}
                  <span className="text-[10px] font-normal text-[var(--ink-soft)]">/{row.cohortSize}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Tile>
  )
}

function RankedGroupTable({ items }: { items: Array<{ label: string; count: number; averageScore: number }> }) {
  return (
    <table className="w-full text-[11.5px]">
      <tbody>
        {items.map((item, i) => (
          <tr key={item.label} className="border-t border-[var(--line)] first:border-t-0">
            <td className="w-4 py-1 pr-1 font-mono text-[var(--ink-soft)]">{i + 1}</td>
            <td className="py-1 pr-2 truncate text-[var(--ink)]">{item.label}</td>
            <td className="py-1 text-right font-mono text-[var(--ink)]">{item.averageScore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AverageScoreByStateTile({ stats }: { stats: StatsResponse }) {
  const items = stats.averageScoreByState
  if (items.length === 0) {
    return (
      <Tile title="Average score by state">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile title={`Average score by state — top ${items.length}`} testId="average-score-by-state-tile">
      <TopGroupTrack title="Highest avg" items={items} />
    </Tile>
  )
}

function TestTakersByStateTile({ stats }: { stats: StatsResponse }) {
  const items = stats.testTakersByState
  if (items.length === 0) {
    return (
      <Tile title="Test-takers by state">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile title={`Test-takers by state — top ${items.length}`} testId="test-takers-by-state-tile">
      <TopGroupTrack title="Most active" items={items.map((item) => ({ ...item, averageScore: item.count }))} />
    </Tile>
  )
}

function TopGroupTrack({ title, items }: { title: string; items: StatsResponse['topCitiesByScore'] }) {
  return (
    <div>
      <h4 className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h4>
      <table className="w-full text-[11.5px]">
        <tbody>
          {items.map((item) => (
            <tr
              key={item.label}
              className={`border-t border-[var(--line)] first:border-t-0 ${
                item.isYou ? 'font-bold text-[var(--signal)]' : ''
              }`}
            >
              <td className="w-4 py-1 pr-1 font-mono text-[var(--ink-soft)]">{item.rank}</td>
              <td className="truncate py-1 pr-2">{item.label}</td>
              <td className="py-1 text-right font-mono">{item.averageScore ?? item.count}</td>
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
      <Tile title="Top cities — two tracks">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile title="Top cities — two tracks" testId="top-cities-tile">
      <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
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
    <div className="space-y-5" data-testid="community-insights">
      {stats.totalUsers === 0 && (
        <p className="text-sm text-[var(--ink-soft)]" data-testid="no-attempts-yet">
          Nobody in {hasSpecificCommunity ? communityScope : 'this group'} has taken the {DOMAIN_LABELS[domain]}{' '}
          test yet — be the first!
        </p>
      )}

      <HeroRow stats={stats} personal={personal} />

      <Chapter title="You, over time">
        {/*
          Full-width rows + equal 3-up KPI strip + two balanced columns.
          Never put a short stack beside a tall chart (that left a dead gap).
        */}
        <ScoreTrendTile personal={personal} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StreakTile personal={personal} />
          <DomainsCoveredTile personal={personal} />
          <TotalTimeInvestedTile personal={personal} />
        </div>

        <ActivityTile personal={personal} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <WhenYouTestBestTile personal={personal} />
            <ConsistencyBandTile personal={personal} />
          </div>
          <div className="flex flex-col gap-3">
            <PaceVsAccuracyTile personal={personal} />
            <RecentAttemptsTile personal={personal} />
          </div>
        </div>
      </Chapter>

      <Chapter title="Where you stand">
        {/*
          CSS multi-column packing: widgets flow top-to-bottom, then into the
          next column — no tall empty pocket under a short card in a rigid row.
        */}
        <div className="md:columns-2 md:gap-3 [column-fill:_balance]">
          <div className="mb-3 break-inside-avoid">
            <RankLadderTile stats={stats} domain={domain} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <NeighborsTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <ThisDomainTile stats={stats} domain={domain} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <CommunitySnapshotTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <ScoreDistributionTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <LocationComparisonTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <DomainCompareTile personal={personal} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <PeerGroupsTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <AverageScoreByStateTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <TestTakersByStateTile stats={stats} />
          </div>
          <div className="mb-3 break-inside-avoid">
            <TopCitiesTile stats={stats} />
          </div>
        </div>
      </Chapter>
    </div>
  )
}
