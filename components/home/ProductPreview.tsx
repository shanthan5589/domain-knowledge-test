'use client'

import { useEffect, useState, type ReactNode } from 'react'
import ScoreGauge from '@/components/ui/ScoreGauge'

// Illustrative sample content only — never real question-bank data or real usage numbers.
const SAMPLE_QUESTION =
  "You're using an AI coding assistant and it confidently suggests a library that doesn't exist. What's the most reliable next step?"

const SAMPLE_OPTIONS = [
  { key: 'A', text: 'Trust it — the model is usually right' },
  { key: 'B', text: 'Ask it to double-check itself in the same chat' },
  { key: 'C', text: 'Verify the package exists in the official registry' },
  { key: 'D', text: 'Rename the import and hope it resolves' },
] as const

const CORRECT_KEY = 'C'
const QUESTION_SECONDS = 32

const SAMPLE_DOMAINS = [
  { id: 'ai', label: 'AI & Generative AI' },
  { id: 'cloud', label: 'Cloud Computing' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'devops', label: 'DevOps & CI/CD' },
  { id: 'data', label: 'Data Science & Analytics' },
] as const

const RANK_ROWS = [
  { scope: 'City', label: 'Bengaluru', percentile: 92, rank: 8, of: 140 },
  { scope: 'Country', label: 'India', percentile: 78, rank: 240, of: 1050 },
] as const

// Last six attempts, out of 10 — most recent last.
const SCORE_HISTORY = [5, 6, 6, 7, 8, 8] as const

// The four panels of the self-playing tour, in order. Durations are how long
// each one stays on screen before the parent advances to the next.
export const PREVIEW_PANELS = ['dashboard', 'assessment', 'results', 'stats'] as const
export type PreviewPanel = (typeof PREVIEW_PANELS)[number]

export const PANEL_DURATIONS: Record<PreviewPanel, number> = {
  dashboard: 1700,
  assessment: 3000,
  results: 2400,
  stats: 3100,
}

const PANEL_LABELS: Record<PreviewPanel, string> = {
  dashboard: 'Dashboard',
  assessment: 'Assessment · AI & Generative AI',
  results: 'Results',
  stats: 'Community Insights',
}

// Signature homepage element: a self-playing, looping recreation of the real
// product journey — pick a domain, take the assessment, see your score, see
// how you rank — built from the app's own ScoreGauge and quiz visuals so
// visitors see an honest preview rather than a generic marketing mockup.
//
// Fully controlled: the parent owns which panel is active so it can sync a
// step list (or anything else) to the same timeline.
export default function ProductPreview({
  panel,
  reducedMotion,
}: {
  panel: PreviewPanel
  reducedMotion: boolean
}) {
  return (
    <div className="relative max-w-2xl mx-auto" aria-hidden="true">
      <div className="absolute -inset-6 sm:-inset-12 rounded-[2rem] bg-[radial-gradient(closest-side,var(--signal-soft),transparent)] opacity-80 blur-2xl motion-safe:animate-ambient pointer-events-none" />
      <div className="relative bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-[var(--ink-soft)] truncate">
            {PANEL_LABELS[panel]}
          </span>
        </div>

        <div className="relative h-[440px] sm:h-[400px] p-6 sm:p-8 flex flex-col justify-center overflow-hidden">
          {/* A fixed (not min-) height keeps this box exactly the same size
              across every panel, so cycling through the demo never shifts
              the page layout beneath it. Keying on `panel` forces a fresh
              mount every time it becomes active, so each panel's internal
              animation always replays from the start — no manual
              reset-in-effect needed. */}
          <FadeIn key={panel}>
            {panel === 'dashboard' && <DashboardPanel />}
            {panel === 'assessment' && <AssessmentPanel />}
            {panel === 'results' && <ResultsPanel reducedMotion={reducedMotion} />}
            {panel === 'stats' && <StatsPanel reducedMotion={reducedMotion} />}
          </FadeIn>
        </div>
      </div>
    </div>
  )
}

// Fades a freshly-mounted panel in instead of popping it in instantly.
function FadeIn({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`transition-all duration-[350ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {children}
    </div>
  )
}

function DashboardPanel() {
  const [stage, setStage] = useState<'idle' | 'hover' | 'select'>('idle')

  useEffect(() => {
    const hoverTimeout = setTimeout(() => setStage('hover'), 650)
    const selectTimeout = setTimeout(() => setStage('select'), 1200)
    return () => {
      clearTimeout(hoverTimeout)
      clearTimeout(selectTimeout)
    }
  }, [])

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1">Welcome back</p>
      <p className="text-base sm:text-lg font-semibold text-[var(--ink)] mb-5">Select a domain to begin</p>

      <div className="grid grid-cols-2 gap-2.5">
        {SAMPLE_DOMAINS.map((domain, i) => {
          const isTarget = domain.id === 'ai'
          const isHovered = isTarget && stage !== 'idle'
          const isSelected = isTarget && stage === 'select'
          return (
            <div
              key={domain.id}
              className={`rounded-lg border-2 px-3 py-3 transition-all duration-300 ${
                isSelected
                  ? 'border-[var(--action)] shadow-md scale-[0.97]'
                  : isHovered
                    ? 'border-[var(--action)]'
                    : 'border-[var(--line)]'
              }`}
            >
              <span className="font-mono text-[10px] text-[var(--signal)] block mb-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-xs font-medium text-[var(--ink)]">{domain.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssessmentPanel() {
  const [stage, setStage] = useState<'idle' | 'reveal' | 'selected'>('idle')
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS)

  useEffect(() => {
    const revealTimeout = setTimeout(() => setStage('reveal'), 1000)
    const selectTimeout = setTimeout(() => setStage('selected'), 1900)
    const timerId = setInterval(() => setSecondsLeft((s) => (s > 1 ? s - 1 : s)), 1000)
    return () => {
      clearTimeout(revealTimeout)
      clearTimeout(selectTimeout)
      clearInterval(timerId)
    }
  }, [])

  const reveal = stage !== 'idle'
  const selected = stage === 'selected'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)]">Question 4 of 10</p>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--line)] bg-[var(--paper)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" />
          <span className="font-mono text-xs font-bold tabular-nums text-[var(--ink)]">
            0:{String(secondsLeft).padStart(2, '0')}
          </span>
        </div>
      </div>

      <p className="text-base sm:text-lg font-semibold text-[var(--ink)] leading-snug mb-4">{SAMPLE_QUESTION}</p>

      <div className="space-y-2">
        {SAMPLE_OPTIONS.map((opt) => {
          const isSelected = selected && opt.key === CORRECT_KEY
          const isRevealed = reveal && opt.key === CORRECT_KEY
          return (
            <div
              key={opt.key}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-colors duration-300 ${
                isSelected ? 'border-blue-500 bg-blue-50' : 'border-[var(--line)] bg-[var(--surface)]'
              }`}
            >
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm transition-colors duration-300 ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-[var(--paper)] text-[var(--ink-soft)]'
                }`}
              >
                {isSelected ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  opt.key
                )}
              </span>
              <span
                className={`text-sm sm:text-[15px] text-[var(--ink)] transition-opacity duration-300 ${
                  isRevealed ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {opt.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultsPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const finalScore = 8
  const finalPercentile = 87
  const [score, setScore] = useState(reducedMotion ? finalScore : 0)
  const [barWidth, setBarWidth] = useState(reducedMotion ? finalPercentile : 0)

  useEffect(() => {
    if (reducedMotion) return
    let current = 0
    const id = setInterval(() => {
      current += 1
      setScore(current)
      if (current >= finalScore) clearInterval(id)
    }, 90)
    const barTimeout = setTimeout(() => setBarWidth(finalPercentile), 250)
    return () => {
      clearInterval(id)
      clearTimeout(barTimeout)
    }
  }, [reducedMotion])

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-3">Test complete</p>

      <div className="flex items-end gap-6 mb-5">
        <div>
          <p className="font-mono text-5xl font-bold text-[var(--ink)] tabular-nums leading-none">
            {score}
            <span className="text-lg font-medium text-[var(--ink-soft)]">/10</span>
          </p>
          <p className="text-xs text-[var(--ink-soft)] mt-1.5">AI &amp; Generative AI</p>
        </div>
        <ScoreGauge score={score} size="lg" />
      </div>

      <div className="border-t border-[var(--line)] pt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              Percentile
            </span>
            <span className="font-mono text-xs font-bold text-[var(--ink)]">{barWidth}th</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--paper)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-[700ms] ease-out"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-[var(--ink-soft)]">Your rank</span>
          <span className="text-[var(--ink)] font-bold">
            #12 <span className="text-[var(--ink-soft)] font-normal">of 140 · Bengaluru</span>
          </span>
        </div>
      </div>
    </div>
  )
}

// A curated slice of the real stats page — tiles, a score trend, and a rank
// ladder — chosen to signal depth without recreating the full dashboard.
function StatsPanel({ reducedMotion }: { reducedMotion: boolean }) {
  const [stage, setStage] = useState(reducedMotion ? 2 : 0)

  useEffect(() => {
    if (reducedMotion) return
    const trendTimeout = setTimeout(() => setStage(1), 250)
    const rankTimeout = setTimeout(() => setStage(2), 650)
    return () => {
      clearTimeout(trendTimeout)
      clearTimeout(rankTimeout)
    }
  }, [reducedMotion])

  const trendVisible = stage >= 1
  const ranksVisible = stage >= 2

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-3">Community insights</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile label="Tests taken" value="6" />
        <StatTile label="Avg score" value="7.4" />
        <StatTile label="Best" value="9/10" />
      </div>

      <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-4 py-3 mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
            Score trend
          </span>
          <span className="font-mono text-xs font-bold text-emerald-700">▲ +3 this month</span>
        </div>
        <div className="flex items-end gap-2 h-11">
          {SCORE_HISTORY.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full rounded-sm bg-[var(--signal)] transition-[height] duration-500 ease-out"
                style={{
                  height: trendVisible ? `${(s / 10) * 100}%` : '4%',
                  transitionDelay: `${i * 70}ms`,
                  opacity: 0.45 + (s / 10) * 0.55,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--line)] pt-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Your rank</p>
        {RANK_ROWS.map((row) => (
          <div key={row.scope} className="grid grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
              {row.scope}
            </span>
            <div className="h-2 rounded-full bg-[var(--paper)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-[700ms] ease-out"
                style={{ width: `${ranksVisible ? row.percentile : 0}%` }}
              />
            </div>
            <span className="text-right font-mono text-[11px] text-[var(--ink)]">
              #{row.rank}
              <span className="text-[var(--ink-soft)]">/{row.of}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-[var(--ink)]">{value}</p>
    </div>
  )
}
