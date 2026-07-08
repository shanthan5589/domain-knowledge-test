'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'

export default function SignupPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  if (status === 'loading' || session) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    // Auto-login after successful signup
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      router.push('/login')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper)] px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-[var(--ink)]">
          Create Account
        </h1>
        <p className="text-center text-[var(--ink-soft)] mb-8 text-sm">
          Sign up to start your assessment
        </p>

        {/* Google Sign-up */}
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="w-full flex items-center justify-center gap-3 border border-[var(--line)] rounded-md px-4 py-3 text-[var(--ink)] font-medium hover:border-[var(--ink)] transition-colors mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <hr className="flex-1 border-[var(--line)]" />
          <span className="text-[var(--ink-soft)] text-xs uppercase tracking-wide">or</span>
          <hr className="flex-1 border-[var(--line)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)]"
                placeholder="John"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)]"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)]"
              placeholder="Min. 8 characters"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--action)] text-white rounded-md px-4 py-3 font-medium hover:bg-[var(--action-hover)] transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--ink-soft)] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--ink)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
