import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-server'
import ProfileEditForm from './ProfileEditForm'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, location, years_of_experience, designation, linkedin_url')
    .eq('email', session.user?.email)
    .single()

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">Domain Knowledge Test</span>
        <a
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-blue-600 transition"
        >
          ← Dashboard
        </a>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Profile</h1>
        <p className="text-gray-500 text-sm mb-8">Update your information below</p>

        <ProfileEditForm
          initialValues={{
            full_name: profile?.full_name ?? session.user?.name ?? '',
            email: profile?.email ?? session.user?.email ?? '',
            location: profile?.location ?? '',
            years_of_experience: profile?.years_of_experience ?? '',
            designation: profile?.designation ?? '',
            linkedin_url: profile?.linkedin_url ?? '',
          }}
        />
      </div>
    </main>
  )
}
