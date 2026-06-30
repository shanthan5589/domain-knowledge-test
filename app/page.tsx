import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HomeSignupForm from '@/components/HomeSignupForm'

export default async function Home() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Nav */}
      <header className="px-8 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-base font-semibold text-gray-900 tracking-tight">
          Domain Knowledge Test
        </span>
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition"
        >
          Sign in to your account →
        </Link>
      </header>

      {/* Split layout */}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-16 px-8 py-12 lg:px-16 xl:px-24 max-w-7xl mx-auto w-full">

        {/* Left — headline + description */}
        <div className="flex-1 flex flex-col">
          <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight mb-6 text-gray-900">
            How well do you actually use AI?
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
            Most professionals have access to the same tools. The best ones drive actual work
            results. Take the 3-minute assessment to see where you stand against global peers.
          </p>
        </div>

        {/* Right — signup card */}
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <HomeSignupForm />
        </div>

      </div>

      {/* Footer */}
      <footer className="py-5 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-400">© Copyright All rights reserved.</p>
      </footer>
    </div>
  )
}
