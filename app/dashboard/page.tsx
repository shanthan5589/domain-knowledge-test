import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-server'
import DomainSelector from '@/components/DomainSelector'
import LogoutButton from '@/components/LogoutButton'
import type { Domain } from '@/lib/types'

const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'AI & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science & Analytics',
}

const ALL_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

interface ResultRow {
  domain: string
  score: number
  time_taken_seconds: number
  completed_at: string
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { data: rawResults } = await supabaseAdmin
    .from('test_results')
    .select('domain, score, time_taken_seconds, completed_at')
    .eq('user_email', session.user?.email)
    .order('completed_at', { ascending: false })

  const latestByDomain: Partial<Record<Domain, ResultRow>> = {}
  for (const row of (rawResults ?? []) as ResultRow[]) {
    const d = row.domain as Domain
    if (!latestByDomain[d]) latestByDomain[d] = row
  }

  const hasAnyResult = Object.keys(latestByDomain).length > 0
  const firstName = session.user?.name?.split(' ')[0] ?? session.user?.email

  return (
    <main className="min-h-screen bg-neutral-100">
      {/* Top nav */}
      <div className="bg-white border-b border-neutral-200 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-neutral-900 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-[9px] font-bold">DK</span>
          </div>
          <span className="text-sm font-bold text-neutral-900">Domain Knowledge Test</span>
        </div>
        <LogoutButton />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
            Welcome back
          </p>
          <h1 className="text-2xl font-bold text-neutral-900">{firstName}</h1>
          <p className="text-sm text-neutral-500 mt-1">Select a domain to begin your assessment</p>
        </div>

        {/* Domain selector */}
        <DomainSelector />

        {/* Results history */}
        {hasAnyResult && (
          <div className="mt-12">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-4">
              Your results
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_DOMAINS.map((domain) => {
                const result = latestByDomain[domain]
                if (!result) return null
                const passed = result.score >= 7
                const mins = Math.floor(result.time_taken_seconds / 60)
                const secs = result.time_taken_seconds % 60
                return (
                  <div
                    key={domain}
                    className="bg-white border border-neutral-200 rounded-lg shadow-sm p-5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                      {DOMAIN_LABELS[domain]}
                    </p>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-4xl font-black text-neutral-900">{result.score}</span>
                      <span className="text-base font-bold text-neutral-400 mb-1">/ 10</span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {mins}m {secs}s &middot;{' '}
                      {new Date(result.completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className={`mt-2 text-xs font-semibold ${passed ? 'text-emerald-700' : 'text-red-500'}`}>
                      {passed ? 'Passed' : 'Needs improvement'}
                    </p>
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
