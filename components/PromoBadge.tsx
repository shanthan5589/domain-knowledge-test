'use client'

import { PROMO_BADGE_ENABLED, PROMO_BADGE_LABEL, PROMO_BADGE_URL } from '@/lib/promo'
import { trackEvent } from '@/lib/analytics'

// Passive "Powered by Castor AI" link shown continuously in the quiz header
// (Q1 through Q10) — not part of the one-time interstitial cap, just quiet
// baseline branding. Returns null entirely when the badge switch is off.
export default function PromoBadge() {
  if (!PROMO_BADGE_ENABLED) return null

  return (
    <a
      href={PROMO_BADGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('cta_clicked', { location: 'quiz_badge', brand: 'castor' })}
      className="font-mono text-[10px] uppercase tracking-wide text-[var(--ink-soft)] hover:text-[var(--action)] transition-colors"
    >
      {PROMO_BADGE_LABEL}
    </a>
  )
}
