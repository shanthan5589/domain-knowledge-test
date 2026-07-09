import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-server'
import DomainSelector from '@/components/DomainSelector'
import UserMenu from '@/components/UserMenu'
import AppHeader from '@/components/AppHeader'
import ScoreGauge from '@/components/ui/ScoreGauge'
import type { Domain } from '@/lib/types'
import { ALL_DOMAINS, DOMAIN_LABELS_SHORT as DOMAIN_LABELS } from '@/lib/domains'
import { latestByKey } from '@/lib/latest-by-key'

function getScoreTier(score: number) {
  if (score >= 9) return { label: 'Excellent', color: '#15803D' }
  if (score >= 7) return { label: 'Good', color: '#4338CA' }
  if (score >= 5) return { label: 'Average', color: 'var(--signal)' }
  return { label: 'Needs improvement', color: '#B42318' }
}

interface ResultRow {
  domain: string
  score: number
  time_taken_seconds: number
  completed_at: string
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Enforce profile completion — check DB directly so it's always current.
  // Also check new location fields so existing users with the old location column
  // are required to re-complete their profile with country/state/city.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('profile_completed, country, state_region, city')
    .eq('email', session.user?.email)
    .single()

  const profileComplete =
    profile?.profile_completed && profile?.country && profile?.state_region && profile?.city

  if (!profileComplete) redirect('/profile/complete')

  // Fetch this user's most recent attempt per domain
  const { data: rawResults } = await supabaseAdmin
    .from('test_results')
    .select('domain, score, time_taken_seconds, completed_at')
    .eq('user_email', session.user?.email)
    .order('completed_at', { ascending: false })

  // Keep only the latest result per domain
  const latestByDomain: Partial<Record<Domain, ResultRow>> = Object.fromEntries(
    latestByKey((rawResults ?? []) as ResultRow[], (row) => row.domain as Domain)
  )

  const hasAnyResult = Object.keys(latestByDomain).length > 0

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <AppHeader right={<UserMenu />} />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Welcome header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[var(--ink)] mb-2">
            Welcome, {session.user?.name?.split(' ')[0] ?? session.user?.email}!
          </h1>
          <p className="text-[var(--ink-soft)]">Select a domain to begin your assessment</p>
        </div>

        {/* Domain selector */}
        <DomainSelector />

        {/* Results history */}
        {hasAnyResult && (
          <div className="mt-14">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-soft)] pb-3 mb-5 border-b border-[var(--line)]">
              Your Results
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_DOMAINS.map((domain) => {
                const result = latestByDomain[domain]
                if (!result) return null
                const mins = Math.floor(result.time_taken_seconds / 60)
                const secs = result.time_taken_seconds % 60
                const { label, color } = getScoreTier(result.score)
                return (
                  <Link
                    href={`/stats?domain=${domain}`}
                    key={domain}
                    className="block bg-[var(--surface)] rounded-lg border border-[var(--line)] p-5 hover:border-gray-300 transition-colors"
                  >
                    <p className="text-xs font-medium text-[var(--ink-soft)] mb-2 uppercase tracking-wide">
                      {DOMAIN_LABELS[domain]}
                    </p>
                    <div className="flex items-baseline gap-1.5 mb-3">
                      <span className="font-mono text-4xl font-bold text-[var(--ink)]">
                        {result.score}
                      </span>
                      <span className="text-sm font-medium text-[var(--ink-soft)]">/ 10</span>
                    </div>
                    <ScoreGauge score={result.score} />
                    <p className="text-xs text-[var(--ink-soft)] mt-3">
                      Completed in {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} &middot;{' '}
                      {new Date(result.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="mt-2 text-xs font-semibold" style={{ color }}>
                      {label}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
