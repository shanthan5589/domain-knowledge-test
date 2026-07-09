'use client'

import { useEffect, useState } from 'react'
import { ALL_DOMAINS, DOMAIN_LABELS_SHORT } from '@/lib/domains'
import type { Domain } from '@/lib/types'
import { useSectionActive } from './useSectionActive'

// Illustrative sample data only — a stand-in for the real Community Insights
// page, never real usage numbers.
const SCORE_HISTORY = [4, 5, 6, 6, 7, 7, 8, 8] as const

const DOMAIN_SCORES: Record<Domain, number> = {
  ai: 8,
  cloud: 6,
  cybersecurity: 7,
  devops: 5,
  data_science: 7,
}

const RANK_ROWS = [
  { scope: 'City', label: 'Bengaluru', percentile: 92, rank: 8 },
  { scope: 'State', label: 'Karnataka', percentile: 84, rank: 61 },
  { scope: 'Country', label: 'India', percentile: 78, rank: 240 },
] as const

// A larger, static counterpart to the compact stats panel inside the "how
// it works" preview — same window-chrome look and the same reveal /
// bar-fill technique. Only starts animating once the card is the one
// actually on screen, and resets every time you scroll away, so it replays
// if you come back (see useSectionActive for why this can't just use an
// IntersectionObserver).
export default function StatsShowcase() {
  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [stage, setStage] = useState(0)
  const { ref } = useSectionActive<HTMLDivElement>((active) => {
    if (!reducedMotion) setStage(active ? 1 : 0)
  })

  useEffect(() => {
    if (stage !== 1) return
    const barsTimeout = setTimeout(() => setStage(2), 300)
    const rankTimeout = setTimeout(() => setStage(3), 850)
    return () => {
      clearTimeout(barsTimeout)
      clearTimeout(rankTimeout)
    }
  }, [stage])

  const barsVisible = reducedMotion || stage >= 2
  const ranksVisible = reducedMotion || stage >= 3

  return (
    <div ref={ref} className="relative max-w-5xl mx-auto" aria-hidden="true">
      <div className="absolute -inset-8 sm:-inset-14 rounded-[2rem] bg-[radial-gradient(closest-side,var(--signal-soft),transparent)] opacity-70 blur-2xl motion-safe:animate-ambient pointer-events-none" />
      <div className="relative bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--line)]" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-[var(--ink-soft)] truncate">
            Community Insights
          </span>
        </div>

        <div className="p-7 sm:p-9">
          {/* Headline tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
            <MiniTile label="Tests taken" value="6" />
            <MiniTile label="Avg score" value="7.4" />
            <MiniTile label="Best" value="9/10" />
            <MiniTile label="Percentile" value="87th" />
          </div>

          {/* Trend, domain breakdown, and rank — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                  Score trend
                </span>
                <span className="font-mono text-[11px] font-bold text-emerald-700">▲ +4</span>
              </div>
              <div className="flex items-end gap-1.5 h-20">
                {SCORE_HISTORY.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full rounded-sm bg-[var(--signal)] transition-[height] duration-500 ease-out"
                      style={{
                        height: barsVisible ? `${(s / 10) * 100}%` : '4%',
                        transitionDelay: `${i * 60}ms`,
                        opacity: 0.45 + (s / 10) * 0.55,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-4 py-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)] block mb-3">
                Domains covered
              </span>
              <div className="space-y-2">
                {ALL_DOMAINS.map((domain, i) => (
                  <div key={domain} className="flex items-center gap-2">
                    <span
                      className="w-14 flex-shrink-0 truncate text-[10px] text-[var(--ink-soft)]"
                      title={DOMAIN_LABELS_SHORT[domain]}
                    >
                      {DOMAIN_LABELS_SHORT[domain]}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-700 ease-out"
                        style={{
                          width: barsVisible ? `${DOMAIN_SCORES[domain] * 10}%` : '0%',
                          transitionDelay: `${i * 70}ms`,
                        }}
                      />
                    </div>
                    <span className="w-5 flex-shrink-0 text-right font-mono text-[10px] text-[var(--ink)]">
                      {DOMAIN_SCORES[domain]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-4 py-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)] block mb-3">
                Your rank
              </span>
              <div className="space-y-2.5">
                {RANK_ROWS.map((row) => (
                  <div key={row.scope} className="flex items-center gap-2">
                    <span className="w-11 flex-shrink-0 text-[10px] font-semibold uppercase text-[var(--ink-soft)]">
                      {row.scope}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-700 ease-out"
                        style={{ width: ranksVisible ? `${row.percentile}%` : '0%' }}
                      />
                    </div>
                    <span className="w-8 flex-shrink-0 text-right font-mono text-[10px] text-[var(--ink)]">
                      #{row.rank}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--paper)] rounded-lg border border-[var(--line)] px-4 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-[var(--ink)]">{value}</p>
    </div>
  )
}
