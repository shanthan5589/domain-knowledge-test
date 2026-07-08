import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-server'
import ProfileEditForm from './ProfileEditForm'
import UserMenu from '@/components/UserMenu'
import AppHeader from '@/components/AppHeader'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, country, state_region, city, years_of_experience, designation, linkedin_url')
    .eq('email', session.user?.email)
    .single()

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <AppHeader right={<UserMenu />} />

      <div className="max-w-xl mx-auto px-4 py-10">
        {/* Back link — belongs in content, not the nav */}
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors mb-6"
        >
          ← Back to Dashboard
        </a>

        <h1 className="text-2xl font-bold text-[var(--ink)] mb-1">Your Profile</h1>
        <p className="text-[var(--ink-soft)] text-sm mb-8">Update your information below</p>

        <ProfileEditForm
          initialValues={{
            full_name: profile?.full_name ?? session.user?.name ?? '',
            email: profile?.email ?? session.user?.email ?? '',
            country: profile?.country ?? '',
            state_region: profile?.state_region ?? '',
            city: profile?.city ?? '',
            years_of_experience: profile?.years_of_experience ?? '',
            designation: profile?.designation ?? '',
            linkedin_url: profile?.linkedin_url ?? '',
          }}
        />
      </div>
    </main>
  )
}
