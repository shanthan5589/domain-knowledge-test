import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DomainSelector from '@/components/DomainSelector'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {session.user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500">Select a domain to begin your assessment</p>
        </div>
        <DomainSelector />
      </div>
    </main>
  )
}
