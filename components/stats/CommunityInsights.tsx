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

const SPAN_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: 'sm:col-span-1',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
}

function Tile({
  span = 1,
  title,
  note,
  testId,
  children,
}: {
  span?: 1 | 2 | 3 | 4
  title?: string
  note?: string
  testId?: string
  children: ReactNode
}) {
  return (
    <div
      className={`col-span-1 ${SPAN_CLASSES[span]} flex min-w-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition hover:shadow-md`}
      data-testid={testId}
    >
      {title && <p className="mb-0.5 text-[13px] font-semibold text-[var(--ink)]">{title}</p>}
      {note && <p className="mb-2 text-[10.5px] text-[var(--ink-soft)]">{note}</p>}
      <div className="flex flex-1 min-w-0 flex-col justify-center">{children}</div>
    </div>
  )
}

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[11.5px] text-[var(--ink-soft)]">{text}</p>
}

function Chapter({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]">{title}</h2>
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>
      {note && <p className="mb-3 text-[11px] text-[var(--ink-soft)]">{note}</p>}
      {/* dense packing backfills any gaps a span-3/4 tile would otherwise leave
          next to a span-1/2 tile, pulling later smaller tiles forward instead
          of leaving empty grid cells. items-start keeps each tile at its own
          natural height instead of stretching every tile in a row to match
          the tallest one, which is what was making short tiles look hollow. */}
      <div className="grid grid-flow-row-dense grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {children}
      </div>
    </section>
  )
}

// ===== Hero row =====

function HeroRow({ stats, personal }: { stats: StatsResponse; personal: PersonalStatsResponse }) {
  const testsTaken = personal.domainRanges.reduce((sum, d) => sum + d.count, 0)
  const totalScoreSum = personal.domainRanges.reduce((sum, d) => sum + d.mean * d.count, 0)
  const averageScore = testsTaken > 0 ? roundToOne(totalScoreSum / testsTaken) : null
  const bestScore =
    personal.domainRanges.length > 0 ? Math.max(...personal.domainRanges.map((d) => d.max)) : null

  return (
    <div className="grid grid-cols-2 items-start gap-3.5 sm:grid-cols-4" data-testid="hero-row">
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Tests taken</p>
        <p className="font-mono text-2xl font-bold text-[var(--ink)]">{testsTaken}</p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Average score</p>
        <p className="font-mono text-2xl font-bold text-[var(--ink)]">{averageScore ?? '—'}</p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Best score</p>
        <p className="font-mono text-2xl font-bold text-[var(--ink)]">
          {bestScore ?? '—'}
          {bestScore !== null && <span className="text-sm font-normal text-[var(--ink-soft)]">/10</span>}
        </p>
      </Tile>
      <Tile>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Percentile</p>
        <p className="font-mono text-2xl font-bold text-[var(--ink)]">
          {stats.percentile !== null ? (
            <>
              {stats.percentile}
              <span className="text-sm font-normal">{ordinalSuffix(stats.percentile)}</span>
            </>
          ) : (
            '—'
          )}
        </p>
      </Tile>
    </div>
  )
}

// ===== Chapter 1: You, over time =====

function ScoreTrendTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.pacePoints.slice(-12)
  if (points.length === 0) {
    return (
      <Tile span={3} title="Score trend">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  const w = 560
  const h = 120
  const padX = 20
  const padTop = 15
  const padBottom = 105
  const xStep = points.length > 1 ? (w - padX * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => ({
    x: padX + i * xStep,
    y: padBottom - (Math.max(0, Math.min(10, p.score)) / 10) * (padBottom - padTop),
  }))
  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const areaPoints = `${padX},${padBottom} ${polylinePoints} ${(w - padX).toFixed(1)},${padBottom}`
  const last = coords[coords.length - 1]

  return (
    <Tile span={3} title="Score trend" testId="score-trend">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Score trend over your recent attempts">
        <line x1={padX} y1={padTop} x2={w - padX} y2={padTop} stroke="var(--line)" strokeWidth={1} opacity={0.5} />
        <line
          x1={padX}
          y1={(padTop + padBottom) / 2}
          x2={w - padX}
          y2={(padTop + padBottom) / 2}
          stroke="var(--line)"
          strokeWidth={1}
          opacity={0.5}
        />
        <line x1={padX} y1={padBottom} x2={w - padX} y2={padBottom} stroke="var(--line)" strokeWidth={1} />
        <polygon points={areaPoints} fill="var(--signal-soft)" opacity={0.6} />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {last && <circle cx={last.x} cy={last.y} r={4.5} fill="var(--signal)" />}
      </svg>
    </Tile>
  )
}

function StreakTile({ personal }: { personal: PersonalStatsResponse }) {
  const { currentStreak, longestStreak } = personal.streaks
  const flames = Array.from({ length: 7 }, (_, i) => i < Math.min(currentStreak, 7))
  return (
    <Tile span={1} title="Streak" testId="streak-tile">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] font-bold leading-none text-[var(--ink)]">{currentStreak}</span>
        <span className="text-[11px] text-[var(--ink-soft)]">{currentStreak === 1 ? 'day' : 'days'}</span>
      </div>
      <div className="mt-2.5 flex gap-[3px]">
        {flames.map((on, i) => (
          <div
            key={i}
            className={`h-3.5 flex-1 rounded-[3px] ${on ? 'bg-[var(--signal)]' : 'bg-[var(--paper)]'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10.5px] text-[var(--ink-soft)]">
        Best: <span className="font-mono font-semibold text-[var(--ink)]">{longestStreak}</span>{' '}
        {longestStreak === 1 ? 'day' : 'days'}
      </p>
    </Tile>
  )
}

const ACTIVITY_GRID_DAYS = 96
const ACTIVITY_GRID_COLS = 24

function ActivityTile({ personal }: { personal: PersonalStatsResponse }) {
  const countByDate = new Map(personal.activityCalendar.map((d) => [d.date, d.count]))
  const today = new Date()
  const cells = Array.from({ length: ACTIVITY_GRID_DAYS }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (ACTIVITY_GRID_DAYS - 1 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key, count: countByDate.get(key) ?? 0 }
  })
  const maxCount = Math.max(1, ...cells.map((c) => c.count))
  const levelColors = ['var(--paper)', 'var(--signal-soft)', '#a9c0f6', 'var(--signal)', '#1d3fae']
  function levelFor(count: number) {
    if (count === 0) return 0
    const ratio = count / maxCount
    if (ratio > 0.8) return 4
    if (ratio > 0.6) return 3
    if (ratio > 0.35) return 2
    return 1
  }

  return (
    <Tile span={3} title="Activity" testId="activity-tile">
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${ACTIVITY_GRID_COLS}, minmax(0,1fr))` }}
      >
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.date}: ${cell.count} ${cell.count === 1 ? 'attempt' : 'attempts'}`}
            className="aspect-square rounded-[2px]"
            style={{ background: levelColors[levelFor(cell.count)] }}
          />
        ))}
      </div>
    </Tile>
  )
}

function DomainsCoveredTile({ personal }: { personal: PersonalStatsResponse }) {
  const attempted = personal.domainRanges.length
  const total = ALL_DOMAINS.length
  const r = 38
  const circumference = 2 * Math.PI * r
  const fraction = total > 0 ? attempted / total : 0
  const dash = circumference * fraction

  return (
    <Tile span={1} title="Domains covered" testId="domains-covered-tile">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--paper)" strokeWidth="14" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--signal)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <span className="absolute font-mono text-sm font-bold text-[var(--ink)]">
          {attempted}
          <span className="text-[10px] font-normal text-[var(--ink-soft)]">/{total}</span>
        </span>
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
      <Tile span={2} title="When you test best" note="day × time of day, color = your avg score there">
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
    <Tile span={2} title="When you test best" note="day × time of day, color = your avg score there" testId="time-of-day-tile">
      <div className="space-y-[3px]">
        {DAY_LABELS.map((day, dayOfWeek) => (
          <div key={dayOfWeek} className="flex items-center gap-[3px]">
            <span className="w-3 text-[8px] text-[var(--ink-soft)]">{day}</span>
            {TIME_OF_DAY_BUCKETS.map((bucket, bucketIndex) => (
              <div
                key={bucket.label}
                className="h-3 flex-1 rounded-sm"
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
  const points = personal.pacePoints.slice(-24)
  if (points.length === 0) {
    return (
      <Tile span={2} title="Pace vs. accuracy" note="time taken vs. score, one dot per attempt">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  const w = 220
  const h = 70
  const padX = 22
  const padTop = 8
  const padBottom = 52
  const maxTime = Math.max(300, ...points.map((p) => p.timeTakenSeconds))

  return (
    <Tile span={2} title="Pace vs. accuracy" note="time taken vs. score, one dot per attempt" testId="pace-vs-accuracy-tile">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
        <line x1={padX} y1={padBottom} x2={w - 4} y2={padBottom} stroke="var(--line)" strokeWidth={1} />
        <line x1={padX} y1={padTop} x2={padX} y2={padBottom} stroke="var(--line)" strokeWidth={1} />
        {points.map((p, i) => {
          const x = padX + (Math.min(p.timeTakenSeconds, maxTime) / maxTime) * (w - padX - 8)
          const y = padBottom - (Math.max(0, Math.min(10, p.score)) / 10) * (padBottom - padTop)
          return <circle key={i} cx={x} cy={y} r={3.2} fill="var(--signal)" opacity={0.7} />
        })}
      </svg>
    </Tile>
  )
}

function ConsistencyBandTile({ personal }: { personal: PersonalStatsResponse }) {
  const ranges = personal.domainRanges
  if (ranges.length === 0) {
    return (
      <Tile span={2} title="Consistency band" note="your lowest, typical, and best score in each domain">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  return (
    <Tile
      span={2}
      title="Consistency band"
      note="your lowest, typical, and best score in each domain"
      testId="consistency-band-tile"
    >
      <div className="space-y-2.5">
        {ranges.map((r) => {
          const color = domainColor(r.domain)
          return (
            <div key={r.domain} className="flex items-center gap-2">
              <span className="w-16 flex-shrink-0 truncate text-[10px] text-[var(--ink-soft)]" title={domainLabel(r.domain)}>
                {domainLabel(r.domain)}
              </span>
              <div className="relative h-1.5 flex-1">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${(r.min / 10) * 100}%`,
                    right: `${100 - (r.max / 10) * 100}%`,
                    background: color,
                    opacity: 0.35,
                  }}
                />
                <div
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${(r.mean / 10) * 100}%`, background: color }}
                />
              </div>
              <span className="w-8 flex-shrink-0 text-right font-mono text-[10px] text-[var(--ink-soft)]">
                {r.mean}
              </span>
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
      <Tile span={2} title="Total time invested">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  const totalSeconds = points.reduce((sum, p) => sum + p.timeTakenSeconds, 0)
  const averageSeconds = Math.round(totalSeconds / points.length)

  return (
    <Tile span={2} title="Total time invested" testId="total-time-tile">
      <div className="grid grid-cols-2 gap-x-4">
        <div>
          <p className="text-[10px] text-[var(--ink-soft)]">Across all attempts</p>
          <p className="font-mono text-lg font-bold text-[var(--ink)]">{formatDuration(totalSeconds)}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--ink-soft)]">Average per attempt</p>
          <p className="font-mono text-lg font-bold text-[var(--ink)]">{formatDuration(averageSeconds)}</p>
        </div>
      </div>
    </Tile>
  )
}

function RecentAttemptsTile({ personal }: { personal: PersonalStatsResponse }) {
  const attempts = personal.recentAttempts.slice(0, 6)
  if (attempts.length === 0) {
    return (
      <Tile span={3} title="Recent attempts">
        <EmptyNote text="No attempts yet." />
      </Tile>
    )
  }

  return (
    <Tile span={3} title="Recent attempts" testId="recent-attempts-tile">
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

function ThisWeekTile({ personal }: { personal: PersonalStatsResponse }) {
  const { change } = personal.weekOverWeek
  return (
    <Tile span={1} title="This week" testId="this-week-tile">
      {change === null ? (
        <EmptyNote text="Not enough data yet." />
      ) : (
        <>
          <span className={`font-mono text-2xl font-bold ${changeClass(change)}`}>{formatChange(change)}</span>
          <p className="mt-1.5 text-[10.5px] text-[var(--ink-soft)]">avg vs. last week</p>
        </>
      )}
    </Tile>
  )
}

// ===== Chapter 2: Where you stand =====

function RankLadderTile({ stats, domain }: { stats: StatsResponse; domain: Domain }) {
  const rungs = stats.rankLadder
  if (rungs.length === 0) {
    return (
      <Tile span={3} title="Your rank">
        <EmptyNote text="Not enough data yet for this filter." />
      </Tile>
    )
  }

  return (
    <Tile span={3} title="Your rank" note={`In ${DOMAIN_LABELS[domain]}`} testId="rank-ladder-tile">
      <div className="space-y-2.5">
        {rungs.map((rung) => (
          <div key={rung.scope} className="grid grid-cols-[64px_1fr_auto] items-center gap-2.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {rung.scope}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--paper)]">
              {rung.percentile !== null && (
                <div className="h-full rounded-full bg-[var(--signal)]" style={{ width: `${rung.percentile}%` }} />
              )}
            </div>
            <span className="whitespace-nowrap text-right font-mono text-[11px] text-[var(--ink)]">
              {rung.rank !== null ? (
                <>
                  <b>#{rung.rank}</b> of {rung.cohortSize}
                </>
              ) : (
                'Not enough data'
              )}{' '}
              <span className="text-[var(--ink-soft)]">· {rung.label}</span>
            </span>
          </div>
        ))}
      </div>
    </Tile>
  )
}

function PercentileMedalTile({ stats }: { stats: StatsResponse }) {
  const pct = stats.percentile
  if (pct === null) {
    return (
      <Tile span={1} title="Percentile">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const topPercent = Math.max(1, 100 - pct)

  return (
    <Tile span={1} title="Percentile" testId="percentile-medal-tile">
      <div className="flex items-center gap-2.5">
        <div
          className="relative h-11 w-11 flex-shrink-0 rounded-full"
          style={{ background: `conic-gradient(var(--signal) 0 ${pct}%, var(--paper) ${pct}% 100%)` }}
        >
          <div className="absolute inset-[5px] flex items-center justify-center rounded-full bg-[var(--surface)]">
            <span className="font-mono text-[11px] font-bold text-[var(--ink)]">
              {pct}
              <span className="text-[9px]">{ordinalSuffix(pct)}</span>
            </span>
          </div>
        </div>
        <p className="text-[11px] text-[var(--ink-soft)]">
          Top {topPercent}%
        </p>
      </div>
    </Tile>
  )
}

// A window of ranks immediately above/below the user — anonymized (rank +
// score only, no name/email) so it can't single anyone out, unlike a
// "R. Iyer" style leaderboard neighbor list.
function NeighborsTile({ stats }: { stats: StatsResponse }) {
  const rows = stats.neighbors
  if (rows.length === 0) {
    return (
      <Tile span={1} title="Neighbors">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile span={1} title="Neighbors" testId="neighbors-tile">
      <div className="overflow-hidden rounded-lg border border-[var(--line)]">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[26px_1fr_auto] items-center gap-1.5 px-2.5 py-1.5 text-[11px] ${
              i > 0 ? 'border-t border-[var(--line)]' : ''
            } ${row.isYou ? 'bg-[var(--signal-soft)] font-bold text-[var(--signal)]' : ''}`}
          >
            <span className="font-mono text-[var(--ink-soft)]">#{row.rank}</span>
            <span>{row.isYou ? 'You' : 'Test-taker'}</span>
            <span className="font-mono">{row.score}</span>
          </div>
        ))}
      </div>
    </Tile>
  )
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

// Crowd-wide numbers (median/mode/top/low/avg time/test-takers) that were
// already fetched for the histogram but had no home in the new layout.
function CommunitySnapshotTile({ stats }: { stats: StatsResponse }) {
  if (stats.totalUsers === 0) {
    return (
      <Tile span={4} title="Community snapshot">
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
    <Tile span={4} title="Community snapshot" testId="community-snapshot-tile">
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-6">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {item.label}
            </p>
            <p className="font-mono text-sm font-bold text-[var(--ink)]">{item.value}</p>
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
      <Tile span={1} title="This domain, last time" note={DOMAIN_LABELS[domain]}>
        <EmptyNote text="You haven't attempted this domain yet." />
      </Tile>
    )
  }

  return (
    <Tile span={1} title="This domain, last time" note={DOMAIN_LABELS[domain]} testId="this-domain-tile">
      <p className="font-mono text-2xl font-bold text-[var(--ink)]">{progress.latestScore}/10</p>
      <p className={`mt-1 text-[11px] font-semibold ${changeClass(progress.scoreChange)}`}>
        {formatChange(progress.scoreChange)} vs. last attempt
      </p>
    </Tile>
  )
}

function LocationComparisonTile({ stats }: { stats: StatsResponse }) {
  const items = stats.locationComparisons
  if (items.length === 0) {
    return (
      <Tile span={4} title="City vs. state vs. country vs. global">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile span={4} title="City vs. state vs. country vs. global" testId="location-comparison-tile">
      <div className="flex h-24 items-end gap-3 px-1">
        {items.map((item) => (
          <div key={item.scope} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-[10px] text-[var(--ink-soft)]">{item.averageScore ?? '—'}</span>
            <div
              className="mx-auto w-full max-w-[64px] rounded-t bg-[var(--signal)]"
              style={{ height: `${((item.averageScore ?? 0) / 10) * 80}px` }}
            />
            <span className="max-w-full truncate text-[9.5px] text-[var(--ink-soft)]" title={item.label}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </Tile>
  )
}

function polygonPoints(values: number[], maxValue: number, radius: number, cx: number, cy: number) {
  const n = values.length
  if (n === 0) return ''
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const r = (Math.max(0, v) / maxValue) * radius
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function DomainRadarTile({ personal }: { personal: PersonalStatsResponse }) {
  const points = personal.domainRadar
  const hasData = points.some((p) => p.you !== null || p.city !== null || p.country !== null)
  if (!hasData) {
    return (
      <Tile span={4} title="Domain radar — you vs. crowd">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const maxValue = 10
  const radius = 64
  const cx = 110
  const cy = 96
  const labelRadius = radius + 24
  const youPoly = polygonPoints(points.map((p) => p.you ?? 0), maxValue, radius, cx, cy)
  const cityPoly = polygonPoints(points.map((p) => p.city ?? 0), maxValue, radius, cx, cy)
  const countryPoly = polygonPoints(points.map((p) => p.country ?? 0), maxValue, radius, cx, cy)
  const gridPoly = polygonPoints(points.map(() => maxValue), maxValue, radius, cx, cy)

  return (
    <Tile
      span={4}
      title="Domain radar — you vs. crowd"
      note="solid = you · dashed = city · dotted = country"
      testId="domain-radar-tile"
    >
      <svg viewBox="0 0 220 192" className="mx-auto h-auto w-full max-w-[360px]">
        <polygon points={gridPoly} fill="none" stroke="var(--line)" strokeWidth={1} />
        <polygon
          points={countryPoly}
          fill="var(--signal)"
          fillOpacity={0.08}
          stroke="var(--ink-soft)"
          strokeWidth={1}
          strokeDasharray="1 3"
        />
        <polygon
          points={cityPoly}
          fill="var(--signal)"
          fillOpacity={0.12}
          stroke="var(--ink-soft)"
          strokeWidth={1.2}
          strokeDasharray="3 2"
        />
        <polygon points={youPoly} fill="var(--signal)" fillOpacity={0.24} stroke="var(--signal)" strokeWidth={2} />
        {points.map((p, i) => {
          const angle = (Math.PI * 2 * i) / points.length - Math.PI / 2
          const lx = cx + labelRadius * Math.cos(angle)
          const ly = cy + labelRadius * Math.sin(angle)
          // Anchor left/right-of-center labels away from the point so long
          // words like "DevOps" grow outward instead of centering off-canvas.
          const anchor = Math.cos(angle) > 0.3 ? 'start' : Math.cos(angle) < -0.3 ? 'end' : 'middle'
          return (
            <text
              key={p.domain}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={11}
              fill="var(--ink-soft)"
            >
              {radarLabel(p.domain)}
            </text>
          )
        })}
      </svg>
    </Tile>
  )
}

function ScoreDistributionTile({ stats }: { stats: StatsResponse }) {
  if (stats.totalUsers === 0) {
    return (
      <Tile span={2} title="Score distribution" note="how many people scored each range — your score marked">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const maxCount = Math.max(1, ...stats.histogram)

  return (
    <Tile
      span={2}
      title="Score distribution"
      note="how many people scored each range — your score marked"
      testId="score-distribution-tile"
    >
      <div className="flex h-16 items-end gap-1">
        {stats.histogram.map((count, score) => {
          const isYou = stats.yourScore === score
          return (
            <div key={score} className="flex h-full flex-1 flex-col items-end justify-end">
              <div
                className={`w-full rounded-t-sm ${isYou ? 'bg-[var(--signal)]' : 'bg-[var(--signal-soft)]'}`}
                style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '2px' : '0' }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {stats.histogram.map((_, score) => (
          <span key={score} className="flex-1 text-center font-mono text-[8px] text-[var(--ink-soft)]">
            {score}
          </span>
        ))}
      </div>
    </Tile>
  )
}

function PeerGroupsTile({ stats }: { stats: StatsResponse }) {
  const rows = stats.peerGroupRanks.filter((row) => row.rank !== null)
  if (rows.length === 0) {
    return (
      <Tile span={4} title="Peer groups">
        <EmptyNote text="Not enough data yet in any of your peer groups." />
      </Tile>
    )
  }

  return (
    <Tile span={4} title="Peer groups" testId="peer-groups-tile">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="text-left text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            <th className="pb-1.5 pr-2">Cohort</th>
            <th className="pb-1.5 pr-2">Test-takers</th>
            <th className="pb-1.5 pr-2">You</th>
            <th className="pb-1.5 pr-2">Average</th>
            <th className="pb-1.5">Your rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dimension} className="border-t border-[var(--line)]">
              <td className="py-1.5 pr-2 text-[var(--ink)]">
                {row.dimension} · {row.label}
              </td>
              <td className="py-1.5 pr-2 font-mono text-[var(--ink-soft)]">{row.cohortSize}</td>
              <td className="py-1.5 pr-2 font-mono font-semibold text-[var(--ink)]">{stats.yourScore ?? '—'}</td>
              <td className="py-1.5 pr-2 font-mono text-[var(--ink-soft)]">{row.averageScore ?? '—'}</td>
              <td className="py-1.5 font-mono font-semibold text-[var(--signal)]">#{row.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      <Tile span={2} title="Average score by state">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const half = Math.ceil(items.length / 2)

  return (
    <Tile
      span={2}
      title={`Average score by state — top ${items.length}`}
      testId="average-score-by-state-tile"
    >
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <RankedGroupTable items={items.slice(0, half)} />
        <RankedGroupTable items={items.slice(half)} />
      </div>
    </Tile>
  )
}

function TestTakersByStateTile({ stats }: { stats: StatsResponse }) {
  const items = stats.testTakersByState
  if (items.length === 0) {
    return (
      <Tile span={2} title="Test-takers by state">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  const half = Math.ceil(items.length / 2)
  const asCountRows = items.map((item) => ({ label: item.label, count: item.count, averageScore: item.count }))

  return (
    <Tile span={2} title={`Test-takers by state — top ${items.length}`} testId="test-takers-by-state-tile">
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <RankedGroupTable items={asCountRows.slice(0, half)} />
        <RankedGroupTable items={asCountRows.slice(half)} />
      </div>
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
      <Tile span={2} title="Top cities — two tracks">
        <EmptyNote text="Not enough data yet." />
      </Tile>
    )
  }

  return (
    <Tile span={2} title="Top cities — two tracks" testId="top-cities-tile">
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
    <div className="space-y-8" data-testid="community-insights">
      {stats.totalUsers === 0 && (
        <p className="text-sm text-[var(--ink-soft)]" data-testid="no-attempts-yet">
          Nobody in {hasSpecificCommunity ? communityScope : 'this group'} has taken the {DOMAIN_LABELS[domain]}{' '}
          test yet — be the first!
        </p>
      )}

      <HeroRow stats={stats} personal={personal} />

      <Chapter title="You, over time">
        <ScoreTrendTile personal={personal} />
        <StreakTile personal={personal} />
        <ActivityTile personal={personal} />
        <DomainsCoveredTile personal={personal} />
        <WhenYouTestBestTile personal={personal} />
        <PaceVsAccuracyTile personal={personal} />
        <ConsistencyBandTile personal={personal} />
        <TotalTimeInvestedTile personal={personal} />
        <RecentAttemptsTile personal={personal} />
        <ThisWeekTile personal={personal} />
      </Chapter>

      <Chapter title="Where you stand">
        <RankLadderTile stats={stats} domain={domain} />
        <PercentileMedalTile stats={stats} />
        <NeighborsTile stats={stats} />
        <ThisDomainTile stats={stats} domain={domain} />
        <CommunitySnapshotTile stats={stats} />
        <LocationComparisonTile stats={stats} />
        <DomainRadarTile personal={personal} />
        <ScoreDistributionTile stats={stats} />
        <PeerGroupsTile stats={stats} />
        <AverageScoreByStateTile stats={stats} />
        <TopCitiesTile stats={stats} />
        <TestTakersByStateTile stats={stats} />
      </Chapter>
    </div>
  )
}
