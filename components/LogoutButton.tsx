'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-sm font-medium px-4 py-2 rounded-md border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
    >
      Log out
    </button>
  )
}
