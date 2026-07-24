'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

// Fires a single funnel event once, on mount. Exists so server components
// (which cannot call the browser-only track()) can still emit a page-view
// event by rendering this tiny client child. Used for landing_viewed.
export default function PageViewTracker({ event }: { event: 'landing_viewed' }) {
  // Guard against React StrictMode double-invoking effects in dev, which would
  // otherwise fire the event twice.
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    trackEvent(event)
  }, [event])

  return null
}
