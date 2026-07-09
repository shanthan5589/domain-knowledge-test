// Promo content and controls for the Castor AI cross-promotion shown on the
// quiz screen: a one-time mid-quiz interstitial and a passive "Powered by"
// badge. Two independent switches so either surface can be turned off
// without affecting the other. All copy and links live here so they can be
// edited without touching quiz logic or component markup.

// Flip either to false and that surface disappears completely, everywhere,
// with zero other code changes.
export const PROMO_INTERSTITIAL_ENABLED = true
export const PROMO_BADGE_ENABLED = false

function buildCastorUrl(utmMedium: string): string {
  const url = new URL('https://castorai.in')
  url.searchParams.set('utm_source', 'edu')
  url.searchParams.set('utm_medium', utmMedium)
  return url.toString()
}

// Distinct utm_medium per surface so badge vs. interstitial clicks can be
// told apart later in analytics.
export const PROMO_INTERSTITIAL_URL = buildCastorUrl('quiz_interstitial')
export const PROMO_BADGE_URL = buildCastorUrl('quiz_badge')

// Copy for the one-time mid-quiz interstitial card. Kept short and scannable
// — this interrupts an in-progress quiz, so it's one line, not a paragraph.
export const PROMO_EYEBROW = 'A quick read'
export const PROMO_BODY =
  'At Castor AI, we provide AI Workforce Training and Software & Automation Solutions.'
export const PROMO_LINK_LABEL = 'See how'
export const PROMO_CTA_LABEL = 'Continue Quiz'

// Copy for the passive, always-visible header badge.
export const PROMO_BADGE_LABEL = 'Powered by Castor AI'

// Picks the (0-indexed) question index after which the interstitial fires,
// randomized fresh per attempt. Valid range is strictly between question 5
// and the last question — i.e. after Q6, Q7, Q8, or Q9 for a 10-question
// quiz — so it never fires at the very start, right after Q5, or on the
// final question (which submits instead of advancing).
export function pickInterstitialTriggerIndex(totalQuestions: number): number {
  const min = 5 // index 5 = "just answered Q6"
  const max = totalQuestions - 2 // "just answered second-to-last question"
  return min + Math.floor(Math.random() * (max - min + 1))
}
