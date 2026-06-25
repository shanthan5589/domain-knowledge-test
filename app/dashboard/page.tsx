import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-server'
import DomainSelector from '@/components/DomainSelector'
import UserMenu from '@/components/UserMenu'
import type { Domain } from '@/lib/types'

const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'AI & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science & Analytics',
}

const ALL_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

function getScoreTier(score: number) {
  if (score >= 9) return { label: 'Excellent', scoreColor: 'text-green-600', labelColor: 'text-green-600' }
  if (score >= 7) return { label: 'Good', scoreColor: 'text-violet-600', labelColor: 'text-violet-600' }
  if (score >= 5) return { label: 'Average', scoreColor: 'text-yellow-500', labelColor: 'text-yellow-500' }
  return { label: 'Needs improvement', scoreColor: 'text-red-500', labelColor: 'text-red-500' }
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
  const latestByDomain: Partial<Record<Domain, ResultRow>> = {}
  for (const row of (rawResults ?? []) as ResultRow[]) {
    const d = row.domain as Domain
    if (!latestByDomain[d]) latestByDomain[d] = row
  }

  const hasAnyResult = Object.keys(latestByDomain).length > 0

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Domain Knowledge Test</span>
        <UserMenu />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Welcome header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {session.user?.name?.split(' ')[0] ?? session.user?.email}!
          </h1>
          <p className="text-gray-500">Select a domain to begin your assessment</p>
        </div>

        {/* Domain selector */}
        <DomainSelector />

        {/* Results history */}
        {hasAnyResult && (
          <div className="mt-14">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Your Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_DOMAINS.map((domain) => {
                const result = latestByDomain[domain]
                if (!result) return null
                const mins = Math.floor(result.time_taken_seconds / 60)
                const secs = result.time_taken_seconds % 60
                const { label, scoreColor, labelColor } = getScoreTier(result.score)
                return (
                  <div
                    key={domain}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                  >
                    <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">
                      {DOMAIN_LABELS[domain]}
                    </p>
                    <div className="flex items-end gap-1 mb-1">
                      <span className={`text-4xl font-black ${scoreColor}`}>
                        {result.score}
                      </span>
                      <span className="text-lg font-bold text-gray-400 mb-1">/ 10</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Completed in {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} &middot;{' '}
                      {new Date(result.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <div className={`mt-2 text-xs font-medium ${labelColor}`}>
                      {label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
