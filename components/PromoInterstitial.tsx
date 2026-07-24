'use client'

import { useEffect, useState } from 'react'
import {
  PROMO_AD_TAG_LABEL,
  PROMO_BODY,
  PROMO_BRAND_NAME,
  PROMO_CONTINUE_DELAY_SECONDS,
  PROMO_CONTINUE_LABEL,
  PROMO_CTA_LABEL,
  PROMO_INTERSTITIAL_URL,
} from '@/lib/promo'
import { trackEvent } from '@/lib/analytics'

interface PromoInterstitialProps {
  onContinue: () => void
}

// One-time mid-quiz overlay promoting Castor AI, shown at a randomized point
// between question 6 and the second-to-last question. Deliberately styled to
// read as a real ad unit (brand chip + "Ad" tag + one strong CTA) rather than
// an in-app dialog — a single dark button is the only prominent action; the
// way back into the quiz is a quiet text link, not a competing button.
export default function PromoInterstitial({ onContinue }: PromoInterstitialProps) {
  // Continue is locked for a few seconds (like a skippable video ad) so the
  // user has to at least glance at the ad before leaving. The outbound CTA
  // has no such gate — it's clickable the instant the card appears.
  const [secondsLeft, setSecondsLeft] = useState(PROMO_CONTINUE_DELAY_SECONDS)
  const canContinue = secondsLeft <= 0

  useEffect(() => {
    if (secondsLeft <= 0) return
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [secondsLeft])

  return (
    <div
      data-testid="promo-interstitial"
      className="fixed inset-0 bg-[var(--ink)]/60 flex items-center justify-center z-50 px-4"
    >
      <div className="bg-[var(--surface)] rounded-xl shadow-2xl max-w-sm w-full p-5 text-left">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-[var(--action)] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            C
          </div>
          <span className="text-sm font-medium text-[var(--ink)]">{PROMO_BRAND_NAME}</span>
          <span className="ml-auto text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {PROMO_AD_TAG_LABEL}
          </span>
        </div>

        <p className="text-[15px] font-medium text-[var(--ink)] leading-snug mb-4">{PROMO_BODY}</p>

        <a
          href={PROMO_INTERSTITIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('cta_clicked', { location: 'quiz_interstitial', brand: 'castor' })}
          className="block w-full text-center bg-[var(--action)] text-white rounded-md py-3 font-medium hover:bg-[var(--action-hover)] transition-colors"
        >
          {PROMO_CTA_LABEL} →
        </a>

        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="block w-full text-center text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--action)] transition-colors mt-3 py-2 disabled:opacity-50 disabled:hover:text-[var(--ink-soft)] disabled:cursor-not-allowed"
        >
          {canContinue ? PROMO_CONTINUE_LABEL : `${PROMO_CONTINUE_LABEL} (${secondsLeft}s)`}
        </button>
      </div>
    </div>
  )
}
