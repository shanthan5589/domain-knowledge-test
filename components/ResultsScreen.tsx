'use client'

import { useRouter } from 'next/navigation'
import ScoreGauge from '@/components/ui/ScoreGauge'
import type { Domain } from '@/lib/types'
import { DOMAIN_LABELS } from '@/lib/domains'
import { PROMO_BRAND_NAME } from '@/lib/promo'

interface ResultsScreenProps {
  domain: Domain
  score: number
  onTryAgain: () => void
}

// Tier bands mirror app/test/[domain]/page.tsx and app/dashboard/page.tsx so
// the colour and label a user sees on results match the same score on their
// dashboard tile later.
function getScoreTier(score: number) {
  if (score >= 9) return { key: 'excellent', label: 'Excellent', color: '#15803D' }
  if (score >= 7) return { key: 'good', label: 'Good', color: '#4338CA' }
  if (score >= 5) return { key: 'average', label: 'Average', color: 'var(--signal)' }
  return { key: 'needs-improvement', label: 'Needs improvement', color: '#B42318' }
}

// Personalized one-liner per tier — replaces the generic "Great job!" copy
// that gave the user nothing to act on. Kept short so the CTA card below it
// stays above the fold on typical laptop viewports.
const TIER_DIAGNOSIS: Record<string, string> = {
  excellent: 'You are ahead of most peers on the fundamentals. The next lift is applying these tools inside real team workflows.',
  good: 'A solid working grasp — the gap between "good" and "excellent" is usually workflow depth, not more theory.',
  average: 'You know enough to be dangerous. Structured practice on real-world scenarios is what moves this from a 6 to an 8.',
  'needs-improvement': 'A focused week of hands-on training closes most of this gap. The concepts are learnable — the shortcut is guided practice.',
}

// Which Castor service is the more natural fit for each domain. Training
// domains (AI, Data) → workforce upskilling; ops-heavy domains → automation
// solutions. This is what "domain-based CTA routing" from the audit looks like
// in practice.
type CtaVariant = 'training' | 'automation'
const DOMAIN_CTA_VARIANT: Record<Domain, CtaVariant> = {
  ai: 'training',
  data_science: 'training',
  cloud: 'automation',
  devops: 'automation',
  cybersecurity: 'automation',
}

type TierKey = 'excellent' | 'good' | 'average' | 'needs-improvement'

// Pitch line is tier-only (score-driven, not domain-driven). The user's
// *feeling about their score* is what should shape the emotional copy —
// telling a senior engineer who aced the quiz to "close this gap" reads as
// patronizing regardless of which domain they took. The button below carries
// the domain routing (training vs. automation), so the two concerns stay
// cleanly split: pitch = how you feel; button = where you go next.
const CTA_PITCH: Record<TierKey, string> = {
  excellent: 'Bring your whole team to this level with Castor AI.',
  good: 'Take the next step with Castor AI.',
  average: 'Turn practice into pattern with Castor AI.',
  'needs-improvement': 'Close this gap with Castor AI.',
}

// Button label follows the domain variant (destination differs), so it stays
// separate from the pitch and swaps independently.
const CTA_BUTTON: Record<CtaVariant, string> = {
  training: 'See training programs',
  automation: 'See automation solutions',
}

// utm-tagged so results-screen conversions can be told apart from any other
// Castor surface later. Consistent with the pattern in lib/promo.ts.
function buildCtaUrl(domain: Domain, variant: CtaVariant): string {
  const url = new URL('https://castorai.in')
  url.searchParams.set('utm_source', 'edu')
  url.searchParams.set('utm_medium', 'quiz_results')
  url.searchParams.set('utm_content', `${variant}_${domain}`)
  return url.toString()
}

export default function ResultsScreen({ domain, score, onTryAgain }: ResultsScreenProps) {
  const router = useRouter()
  const tier = getScoreTier(score)
  const diagnosis = TIER_DIAGNOSIS[tier.key]
  const ctaVariant = DOMAIN_CTA_VARIANT[domain]
  const ctaPitch = CTA_PITCH[tier.key as TierKey]
  const ctaButton = CTA_BUTTON[ctaVariant]
  const ctaUrl = buildCtaUrl(domain, ctaVariant)

  return (
    <main className="min-h-screen bg-[var(--paper)] flex items-start sm:items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl space-y-4">
        {/* Unified score + CTA card — the Castor pitch lives inside the same
            card as the score so it reads as "here's your result, here's the
            natural next step" instead of a separate ad block below the score. */}
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-xl overflow-hidden">
          {/* Score section */}
          <div className="p-6 sm:p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-1">
              {DOMAIN_LABELS[domain]}
            </p>
            <h1 className="text-2xl font-bold text-[var(--ink)] mb-6">Your benchmark</h1>

            <div className="mb-3">
              <span className="font-mono text-7xl font-bold" style={{ color: tier.color }}>
                {score}
              </span>
              <span className="text-3xl font-bold text-[var(--ink-soft)]"> / 10</span>
            </div>
            <div className="flex justify-center mb-5">
              <ScoreGauge score={score} size="lg" />
            </div>
            <p className="text-sm font-semibold mb-4" style={{ color: tier.color }}>
              {tier.label}
            </p>
            <p className="text-[var(--ink-soft)] leading-relaxed max-w-md mx-auto">
              {diagnosis}
            </p>
          </div>

          {/* Inline Castor CTA — subtly-tinted footer of the same card, not a
              standalone dark ad block. Domain-routed so AI/Data users see
              Training and ops-heavy users see Automation. */}
          <div className="border-t border-[var(--line)] bg-[var(--paper)] px-6 sm:px-10 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[var(--action)] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                C
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-soft)] mb-0.5">
                  {PROMO_BRAND_NAME}
                </p>
                <p className="text-sm text-[var(--ink)] leading-snug">{ctaPitch}</p>
              </div>
            </div>
            <a
              data-testid="results-castor-cta"
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[var(--action)] text-white rounded-md px-5 py-2.5 text-sm font-semibold whitespace-nowrap hover:bg-[var(--action-hover)] transition-colors flex-shrink-0"
            >
              {ctaButton}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* Secondary actions — outlined, de-emphasized against the primary
            CTA above. */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onTryAgain}
            className="flex-1 border border-[var(--line)] bg-[var(--surface)] rounded-md py-3 text-sm text-[var(--ink)] font-medium hover:border-[var(--ink)] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 border border-[var(--line)] bg-[var(--surface)] rounded-md py-3 text-sm text-[var(--ink)] font-medium hover:border-[var(--ink)] transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}
