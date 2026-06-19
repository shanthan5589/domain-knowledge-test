'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-xs font-medium text-neutral-500 hover:text-red-600 transition-colors"
    >
      Log out
    </button>
  )
}
