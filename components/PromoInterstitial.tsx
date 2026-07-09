import {
  PROMO_BODY,
  PROMO_CTA_LABEL,
  PROMO_EYEBROW,
  PROMO_HEADLINE,
  PROMO_INTERSTITIAL_URL,
  PROMO_LINK_LABEL,
} from '@/lib/promo'

interface PromoInterstitialProps {
  onContinue: () => void
}

// One-time mid-quiz overlay promoting Castor AI, shown at a randomized point
// between question 6 and the second-to-last question. Mirrors the overlay
// styling of DomainSelector's "Ready to start?" confirmation modal so it
// reads as a sibling of existing app UI rather than a foreign ad unit.
export default function PromoInterstitial({ onContinue }: PromoInterstitialProps) {
  return (
    <div
      data-testid="promo-interstitial"
      className="fixed inset-0 bg-[var(--ink)]/60 flex items-center justify-center z-50 px-4"
    >
      <div className="bg-[var(--surface)] rounded-xl p-8 max-w-md w-full shadow-xl text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)] mb-3">
          {PROMO_EYEBROW}
        </p>
        <h2 className="text-xl font-bold text-[var(--ink)] mb-2">{PROMO_HEADLINE}</h2>
        <p className="text-[var(--ink-soft)] text-sm leading-relaxed mb-6">{PROMO_BODY}</p>

        <a
          href={PROMO_INTERSTITIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-[var(--action)] hover:text-[var(--action-hover)] transition-colors mb-6"
        >
          {PROMO_LINK_LABEL} →
        </a>

        <button
          onClick={onContinue}
          className="w-full bg-[var(--action)] text-white rounded-md py-3 font-medium hover:bg-[var(--action-hover)] transition-colors"
        >
          {PROMO_CTA_LABEL}
        </button>
      </div>
    </div>
  )
}
