'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { trackEvent } from '@/lib/analytics'

// Fires signup_completed exactly once per browser session, the first time the
// user is authenticated. Mounted globally inside Providers so it covers every
// entry path (Google, email signup, email login; new and returning users).
// sessionStorage keeps it to once per tab session; the ref stops it firing
// again on re-renders within the same mount.
const GUARD_KEY = 'edu:auth_tracked'

export default function AuthTracker() {
  const { status } = useSession()
  const firedRef = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (firedRef.current) return

    // Read sessionStorage defensively — it can throw in private mode or when
    // storage is disabled. Any failure just means we skip the guard.
    let alreadyTracked = false
    try {
      alreadyTracked = window.sessionStorage.getItem(GUARD_KEY) === '1'
    } catch {
      // ignore
    }

    firedRef.current = true
    if (alreadyTracked) return

    try {
      window.sessionStorage.setItem(GUARD_KEY, '1')
    } catch {
      // ignore
    }
    trackEvent('signup_completed')
  }, [status])

  return null
}
