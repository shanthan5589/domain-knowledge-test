import { PROMO_BODY, PROMO_CTA_LABEL, PROMO_EYEBROW, PROMO_INTERSTITIAL_URL, PROMO_LINK_LABEL } from '@/lib/promo'

interface PromoInterstitialProps {
  onContinue: () => void
}

// One-time mid-quiz overlay promoting Castor AI, shown at a randomized point
// between question 6 and the second-to-last question. Toast/notification
// style: white card, left-aligned, thick signal-colored left edge — a
// distinct silhouette from the app's centered confirmation modals.
export default function PromoInterstitial({ onContinue }: PromoInterstitialProps) {
  return (
    <div
      data-testid="promo-interstitial"
      className="fixed inset-0 bg-[var(--ink)]/60 flex items-center justify-center z-50 px-4"
    >
      <div className="bg-[var(--surface)] rounded-xl border-l-4 border-[var(--signal)] shadow-2xl max-w-sm w-full p-6 text-left">
        <div className="flex items-center gap-2 mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[var(--signal)]" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)]">
            {PROMO_EYEBROW}
          </p>
        </div>
        <h2 className="text-base font-bold text-[var(--ink)] leading-snug mb-5">{PROMO_BODY}</h2>

        <div className="flex items-center justify-between gap-3">
          <a
            href={PROMO_INTERSTITIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--signal)] hover:text-[var(--action)] transition-colors whitespace-nowrap"
          >
            {PROMO_LINK_LABEL} →
          </a>

          <button
            onClick={onContinue}
            className="flex-shrink-0 bg-[var(--action)] text-white rounded-md px-5 py-2.5 font-semibold hover:bg-[var(--action-hover)] transition-colors"
          >
            {PROMO_CTA_LABEL}
          </button>
        </div>
      </div>
    </div>
  )
}
