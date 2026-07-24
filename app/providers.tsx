'use client'

import { SessionProvider } from 'next-auth/react'
import AuthTracker from '@/components/analytics/AuthTracker'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthTracker />
      {children}
    </SessionProvider>
  )
}
