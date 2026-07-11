// Promo content and controls for the Castor AI cross-promotion shown on the
// quiz screen: a one-time mid-quiz interstitial and a passive "Powered by"
// badge. Two independent switches so either surface can be turned off
// without affecting the other. All copy and links live here so they can be
// edited without touching quiz logic or component markup.

// Flip either to false and that surface disappears completely, everywhere,
// with zero other code changes.
export const PROMO_INTERSTITIAL_ENABLED = false
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
export const PROMO_BRAND_NAME = 'Castor AI'
export const PROMO_AD_TAG_LABEL = 'Ad'
export const PROMO_BODY =
  'We provide AI Workforce Training and Software Automation Solutions built around your workflow.'
// Outbound CTA — the only prominent button on the card, matching how a real
// ad reads (one strong call to action, not two competing buttons).
export const PROMO_CTA_LABEL = 'See how'
// Quiet, low-emphasis way back into the quiz — a text link, not a button of
// equal weight to the CTA, so the card still reads as an ad rather than a
// dialog with two equally-weighted choices.
export const PROMO_CONTINUE_LABEL = 'Continue quiz'
// Continue stays disabled for this many seconds after the card appears,
// mirroring a skippable video ad — it guarantees at least a brief look at
// the ad before the user can leave. Does not affect the outbound CTA, which
// is clickable immediately.
export const PROMO_CONTINUE_DELAY_SECONDS = 5

// Copy for the passive, always-visible header badge.
export const PROMO_BADGE_LABEL = 'Powered by Castor AI'

// Picks the (0-indexed) question index after which the interstitial fires,
// randomized fresh per attempt. Valid range is strictly between question 5
// and the last question — i.e. after Q6, Q7, Q8, or Q9 for a 10-question
// quiz — so it never fires at the very start, right after Q5, or on the
// final question (which submits instead of advancing).
//
// Returns -1 (never matches a real currentIndex, so the interstitial simply
// never fires) if the quiz is too short to have any valid trigger point —
// e.g. a 10-question quiz always has a valid range (5-8), but a quiz with
// fewer than 7 questions would not.
export function pickInterstitialTriggerIndex(totalQuestions: number): number {
  const min = 5 // index 5 = "just answered Q6"
  const max = totalQuestions - 2 // "just answered second-to-last question"
  if (max < min) return -1
  return min + Math.floor(Math.random() * (max - min + 1))
}
