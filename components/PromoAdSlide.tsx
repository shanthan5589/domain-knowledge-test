'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import {
  PROMO_AD_SLIDE_FACTS,
  PROMO_AD_SLIDE_URL,
  PROMO_AD_TAG_LABEL,
  PROMO_BRAND_NAME,
  PROMO_CTA_LABEL,
  PROMO_FACT_ROTATE_INTERVAL_MS,
} from '@/lib/promo'

// How long the crossfade itself takes, in ms — purely a visual timing
// constant, not content, so it stays local rather than living in lib/promo.ts.
const FADE_DURATION_MS = 200

// Belt-and-suspenders on top of target="_blank" rel="noopener noreferrer":
// forces the outbound link open via window.open on a plain left click, so a
// browser/extension that ignores target="_blank" on an anchor still can't
// navigate the quiz tab itself away — that would silently abandon the user's
// in-progress attempt, far worse than the ad link merely not opening.
// Modifier-key and non-primary clicks (ctrl/cmd/shift/middle-click) are left
// alone so the browser's native "open in new tab/window" still works.
function openInNewTab(e: MouseEvent<HTMLAnchorElement>) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  window.open(e.currentTarget.href, '_blank', 'noopener,noreferrer')
}

// Ad content for the in-quiz "ad slide" — rendered *inside* the same card
// container that normally wraps QuizQuestion (see app/test/[domain]/page.tsx),
// not a component with its own card/overlay. An auto-advancing strip of short
// facts (with dot indicators, also clickable to jump manually) rather than a
// single static line, so the card has some life to it while it's up. The
// "Skip Ad" action that replaces the Next Question button is owned by the
// page, not this component, so it stays in the exact same button slot
// regardless of which fact is currently showing.
export default function PromoAdSlide() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  // Auto-advance: once the current fact has been visible for the rotate
  // interval, start fading it out. Re-runs whenever index changes so a
  // manual dot click resets the clock too.
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), PROMO_FACT_ROTATE_INTERVAL_MS)
    return () => clearTimeout(id)
  }, [index])

  // Once faded out, swap to the next fact and fade back in.
  useEffect(() => {
    if (visible) return
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % PROMO_AD_SLIDE_FACTS.length)
      setVisible(true)
    }, FADE_DURATION_MS)
    return () => clearTimeout(id)
  }, [visible])

  return (
    <div data-testid="promo-ad-slide" className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full bg-[var(--action)] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          C
        </div>
        <span className="text-sm font-medium text-[var(--ink)]">{PROMO_BRAND_NAME}</span>
        <span className="ml-auto text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
          {PROMO_AD_TAG_LABEL}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 px-2">
        <p
          className="text-lg font-semibold text-[var(--ink)] leading-relaxed transition-opacity"
          style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_DURATION_MS}ms` }}
        >
          {PROMO_AD_SLIDE_FACTS[index]}
        </p>
        <div className="flex items-center gap-1.5">
          {PROMO_AD_SLIDE_FACTS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndex(i)
                setVisible(true)
              }}
              aria-label={`Show fact ${i + 1} of ${PROMO_AD_SLIDE_FACTS.length}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-[var(--action)]' : 'w-1.5 bg-[var(--line)]'
              }`}
            />
          ))}
        </div>
      </div>

      <a
        href={PROMO_AD_SLIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openInNewTab}
        className="block w-full text-center bg-[var(--action)] text-white rounded-md py-3 font-medium hover:bg-[var(--action-hover)] transition-colors"
      >
        {PROMO_CTA_LABEL} →
      </a>
    </div>
  )
}
