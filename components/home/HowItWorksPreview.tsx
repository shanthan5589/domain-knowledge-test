'use client'

import { useEffect, useState } from 'react'
import ProductPreview, { PANEL_DURATIONS, PREVIEW_PANELS, type PreviewPanel } from './ProductPreview'
import { useSectionActive } from './useSectionActive'

const STEPS = [
  {
    title: 'Pick a domain',
    body: 'Choose the one you want an honest read on — AI, Cloud, Cybersecurity, DevOps, or Data.',
    panels: ['dashboard'] as PreviewPanel[],
  },
  {
    title: 'Answer 10 questions',
    body: 'Five minutes on the clock, roughly 30 seconds a question. No pausing, no looking back.',
    panels: ['assessment'] as PreviewPanel[],
  },
  {
    title: 'Get your score, see your rank',
    body: 'Your score out of 10, your percentile, and exactly how you rank against your peers — instantly.',
    panels: ['results', 'stats'] as PreviewPanel[],
  },
]

// Pairs the "how it works" step list with the live product preview, and
// keeps them in lockstep — the step for whichever panel is currently
// playing gets highlighted, the way most product tours pace themselves.
//
// The demo only plays while this section is the one actually on screen —
// gated by useSectionActive — and restarts from the first panel every time
// it becomes active, so it doesn't run ahead in the background and land
// mid-cycle by the time you scroll to it.
export default function HowItWorksPreview() {
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const [panelIndex, setPanelIndex] = useState(0)
  const { ref, active } = useSectionActive<HTMLDivElement>((isActive) => {
    if (isActive) setPanelIndex(0)
  })
  const panel = PREVIEW_PANELS[panelIndex]

  useEffect(() => {
    if (reducedMotion || !active) return
    const id = setTimeout(() => {
      setPanelIndex((i) => (i + 1) % PREVIEW_PANELS.length)
    }, PANEL_DURATIONS[panel])
    return () => clearTimeout(id)
  }, [panel, reducedMotion, active])

  // Reduced motion: freeze on the results panel, the most informative frame.
  const activePanel = reducedMotion ? 'results' : panel
  const activeStep = STEPS.findIndex((step) => step.panels.includes(activePanel))

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
      <div className="lg:col-span-4 space-y-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className={`flex gap-4 rounded-lg border p-4 transition-colors duration-300 ${
              i === activeStep ? 'border-[var(--action)] bg-[var(--surface)] shadow-sm' : 'border-transparent'
            }`}
          >
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-colors duration-300 ${
                i === activeStep ? 'bg-[var(--action)] text-white' : 'bg-[var(--surface)] text-[var(--signal)] border border-[var(--line)]'
              }`}
            >
              {i + 1}
            </span>
            <div>
              <h3 className="font-semibold text-[var(--ink)] mb-1">{step.title}</h3>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="lg:col-span-8">
        <ProductPreview panel={activePanel} reducedMotion={reducedMotion} />
      </div>
    </div>
  )
}
