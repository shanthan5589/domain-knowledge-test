'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = session?.user?.name?.split(' ')[0] ?? session?.user?.email ?? ''
  const initial = (session?.user?.name ?? session?.user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button: avatar + name + chevron */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--paper)] transition-colors"
      >
        {/* Avatar circle */}
        <span className="w-7 h-7 rounded-full bg-[var(--action)] flex items-center justify-center flex-shrink-0">
          <span className="font-mono text-[11px] font-semibold text-white">{initial}</span>
        </span>

        <span className="text-sm font-medium text-[var(--ink)] hidden sm:inline max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-[var(--ink-soft)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          data-testid="user-dropdown"
          className="absolute right-0 mt-2 w-56 bg-[var(--surface)] rounded-lg border border-[var(--line)] shadow-lg py-1 z-50"
        >
          {/* User info (non-interactive) */}
          <div className="px-4 py-3 border-b border-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--ink)] truncate">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-[var(--ink-soft)] truncate mt-0.5">
              {session?.user?.email}
            </p>
          </div>

          {/* Profile link */}
          <button
            onClick={() => { setOpen(false); router.push('/profile') }}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            Profile
          </button>

          {/* Stats link */}
          <button
            onClick={() => { setOpen(false); router.push('/stats') }}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            Stats
          </button>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-4 py-2.5 text-sm text-[var(--ink)] hover:bg-[var(--paper)] transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
