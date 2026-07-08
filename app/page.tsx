import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HomeSignupForm from '@/components/HomeSignupForm'
import Logo from '@/components/Logo'

export default async function Home() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      {/* Nav */}
      <header className="px-4 sm:px-8 py-4 bg-[var(--surface)] border-b border-[var(--line)] flex items-center justify-between">
        <Logo />
        {/* Shorter label on phones so it never wraps against the logo;
            full text restored from sm: up, unchanged from before. */}
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--action)] hover:text-[var(--action-hover)] transition-colors whitespace-nowrap"
        >
          <span className="sm:hidden">Sign in →</span>
          <span className="hidden sm:inline">Sign in to your account →</span>
        </Link>
      </header>

      {/* Split layout */}
      <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-16 px-8 py-12 lg:px-16 xl:px-24 max-w-7xl mx-auto w-full">

        {/* Left — headline + description */}
        <div className="flex-1 flex flex-col">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6 text-[var(--ink)]">
            How well do you actually use AI?
          </h1>
          <p className="text-lg text-[var(--ink-soft)] leading-relaxed max-w-xl">
            Most professionals have access to the same tools. The best ones use them to drive real
            results. Take the 3-minute assessment to get an honest read on your AI skills.
          </p>
        </div>

        {/* Right — signup card */}
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <HomeSignupForm />
        </div>

      </div>

      {/* Footer */}
      <footer className="py-5 border-t border-[var(--line)] text-center">
        <p className="text-sm text-[var(--ink-soft)]">© 2026 Castor AI. All rights reserved.</p>
      </footer>
    </div>
  )
}
