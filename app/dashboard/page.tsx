import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, {session.user?.name}!
        </h1>
        <p className="text-gray-500">Domain selection coming soon...</p>
      </div>
    </div>
  )
}
