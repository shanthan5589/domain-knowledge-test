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

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger button: avatar + name + chevron */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="User menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
      >
        {/* Avatar circle */}
        <span className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white flex-shrink-0">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-5 h-5 text-gray-500"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.5" />
            <path strokeLinecap="round" d="M4.5 20c0-4 3.358-7 7.5-7s7.5 3 7.5 7" />
          </svg>
        </span>

        <span className="text-sm font-medium text-gray-700 hidden sm:inline max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          data-testid="user-dropdown"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50"
        >
          {/* User info (non-interactive) */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {session?.user?.email}
            </p>
          </div>

          {/* Profile link */}
          <button
            onClick={() => { setOpen(false); router.push('/profile') }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Profile
          </button>

          {/* Stats link */}
          <button
            onClick={() => { setOpen(false); router.push('/stats') }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Stats
          </button>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
