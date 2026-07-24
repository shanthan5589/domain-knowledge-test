// Central analytics wrapper for the Edu quiz funnel.
//
// Every funnel event in the app goes through trackEvent() here instead of
// importing Vercel's track() directly, for two reasons:
//   1. One source of truth — the FunnelEvent type below lists every event name
//      and the props each one carries, so call sites stay consistent.
//   2. One place to change the destination — today events go to Vercel Web
//      Analytics; if we later also want to store them in Supabase we edit only
//      this file, never the call sites.
import { track } from '@vercel/analytics'

// The nine funnel events and the props each one carries. Vercel only accepts
// flat props whose values are string | number | boolean | null, so every
// payload below stays flat.
export type FunnelEvent =
  | { name: 'landing_viewed' }
  | { name: 'signup_started'; props: { method: 'google' | 'credentials'; location: string } }
  | { name: 'signup_completed' }
  | { name: 'domain_selected'; props: { domain: string } }
  | { name: 'quiz_started'; props: { domain: string } }
  | { name: 'quiz_completed'; props: { domain: string; score: number } }
  | { name: 'result_viewed'; props: { domain: string; score: number } }
  | { name: 'stats_viewed'; props: { domain: string } }
  | { name: 'cta_clicked'; props: { location: string; brand: string } }

// Allowed value types for a Vercel custom-event property.
type PropValue = string | number | boolean | null

type VaQueue = (...params: unknown[]) => void

// Vercel's <Analytics /> (the /next build) wraps its real component in a
// Suspense boundary internally (it reads useSearchParams for route info), so
// its own effect — the one that creates window.va as a queueing stub ahead of
// the real script loading — commits in a separate, later React pass than
// ordinary siblings. A trackEvent() call fired from a plain mount effect
// (e.g. PageViewTracker's landing_viewed) can therefore run before window.va
// exists at all, and since track() only does `window.va?.call(...)`, that
// call is silently dropped rather than queued. Replicating Vercel's own stub
// here (same shape it creates internally) guarantees the queue exists no
// matter which component sets it up first — both write into the same
// window.vaq array the real script drains once it loads.
function ensureQueue(): void {
  const w = window as unknown as { va?: VaQueue; vaq?: unknown[] }
  if (w.va) return
  w.va = (...params: unknown[]) => {
    if (!w.vaq) w.vaq = []
    w.vaq.push(params)
  }
}

// Fire a funnel event. `name` is constrained to the events above; `props` is
// optional so no-prop events (landing_viewed, signup_completed) can be called
// as trackEvent('landing_viewed').
export function trackEvent(
  name: FunnelEvent['name'],
  props?: Record<string, PropValue>
): void {
  // track() is a browser-only API. On the server (SSR, or an accidental import
  // from a server component) do nothing rather than throw.
  if (typeof window === 'undefined') return
  ensureQueue()
  track(name, props)
}
